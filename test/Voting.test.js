const { ethers } = require('hardhat');
const { expect, assert } = require('chai');

describe("Voting", function () {
  let owner, voter1, voter2, voter3, voter4, voter5;
  let voting;

  describe("Initialization", function () {
    beforeEach(async function () {
        [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
        const contract = await ethers.getContractFactory("Voting");
        voting = await contract.deploy();
    });

    it('should deploy the smart contract', async function () {
        const theOwner = await voting.owner();
        assert.equal(owner.address, theOwner);
    });
  });

  describe("Voters Registration", function () {
    beforeEach(async function () {
      [owner] = await ethers.getSigners();
      const contract = await ethers.getContractFactory("Voting");
      voting = await contract.deploy();
    });

    it('should add voter', async function () {
      const event = await voting.addVoter(voter1.address);
      await expect(event).to.emit(voting, 'VoterRegistered').withArgs(voter1.address);
    });

    it('should NOT add voter if not owner', async function () {
      await expect(voting.connect(voter3).addVoter(voter1.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should NOT add a registered voter', async function() {
        await voting.addVoter(voter1.address)
        await expect(voting.addVoter(voter1.address)).to.be.revertedWith('Already registered')
    })

    it('should end voter registration and start proposal registration', async function () {
      const event = await voting.startProposalsRegistering();
      await expect(event).to.emit(voting, 'WorkflowStatusChange').withArgs(0, 1);
    });

    it('should NOT endProposalsRegistering', async function() {
        await expect(voting.endProposalsRegistering()).to.be.revertedWith("Registering proposals havent started yet")
    });

    it('should NOT add proposal fot this status', async function() {
        await voting.addVoter(voter1.address)
        await expect(voting.connect(voter1).addProposal("First Proposal")).to.be.revertedWith('Proposals are not allowed yet')
    });

  });

  describe("Proposals registration", function () {
    beforeEach(async function () {
      [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
      const contract = await ethers.getContractFactory("Voting");
      voting = await contract.deploy();

      await voting.addVoter(voter1.address);
      await voting.addVoter(voter2.address);
      // Voter 3 is not registered
      await voting.addVoter(voter4.address);
      await voting.addVoter(voter5.address);

      await voting.startProposalsRegistering();
    });

    it('First proposal should be GENESIS', async function () {
      const proposal = await voting.connect(voter1).getOneProposal(0);
      expect(proposal.description).to.equal("GENESIS");
    });

    it('should add proposal', async function () {
      const event = await voting.connect(voter1).addProposal("First Proposal");
      await expect(event).to.emit(voting, 'ProposalRegistered').withArgs(1);
    });

    it('should NOT add proposal if not registered', async function () {
      await expect(voting.connect(voter3).addProposal("Third Proposal")).to.be.revertedWith("You're not a voter");
    });

    it('should NOT add empty proposal', async function () {
      await expect(voting.connect(voter2).addProposal("")).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
    });

    it('should return the correct voter address', async function () {
        const voter = await voting.connect(voter1).getVoter(voter1);
        expect(voter.address).to.equal(voter1.adress);
    });

    it('should NOT startVotingSession', async function() {
        await expect(voting.startVotingSession()).to.be.revertedWith("Registering proposals phase is not finished")
    });
    
  });
  
  describe("Vote session", function () {
    beforeEach(async function () {
      [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
        const contract = await ethers.getContractFactory("Voting");
        voting = await contract.deploy();

        await voting.addVoter(voter1.address);
        await voting.addVoter(voter2.address);
        // Voter 3 is not registered
        await voting.addVoter(voter4.address);
        await voting.addVoter(voter5.address);

        await voting.startProposalsRegistering();

        await voting.connect(voter1).addProposal("First proposal");
        await voting.connect(voter2).addProposal("Second proposal");
        await voting.connect(voter4).addProposal("Third proposal");

        await voting.endProposalsRegistering();

        await voting.startVotingSession();
    });

    it('should NOT vote if not registered', async function () {
      await expect(voting.connect(voter3).setVote(1)).to.be.revertedWith("You're not a voter");
    });

    it('Should NOT vote for not found proposal', async function () {
      await expect(voting.connect(voter1).setVote(10)).to.be.revertedWith('Proposal not found');
    });

    it('Should NOT vote more than one time', async function () {
      await voting.connect(voter1).setVote(3);
      await expect(voting.connect(voter1).setVote(3)).to.be.revertedWith('You have already voted');
    });

    it('Should vote and count votes', async function () {
      let proposal0 = await voting.connect(voter1).getOneProposal(0);
      await voting.connect(voter4).setVote(0);
      proposal0 = await voting.connect(voter1).getOneProposal(0);
      expect(proposal0.voteCount).to.equal(1);

      await voting.connect(voter5).setVote(0);
      proposal0 = await voting.connect(voter1).getOneProposal(0);
      expect(proposal0.voteCount).to.equal(2);
    });

    it('Should end session and send event', async function () {
      const event = await voting.endVotingSession();
      await expect(event).to.emit(voting, 'WorkflowStatusChange').withArgs(3, 4);
    });

    it('should NOT tallyVotes', async function() {
        await expect(voting.tallyVotes()).to.be.revertedWith("Current status is not voting session ended")
    });
    
  });

  describe("End Vote session and Tally", function () {
    beforeEach(async function () {
        [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
        const contract = await ethers.getContractFactory("Voting");
        voting = await contract.deploy();

        await voting.addVoter(voter1.address);
        await voting.addVoter(voter2.address);
        await voting.addVoter(voter3.address);
        await voting.addVoter(voter4.address);
        await voting.addVoter(voter5.address);

        await voting.startProposalsRegistering();

        await voting.connect(voter1).addProposal("First proposal");
        await voting.connect(voter2).addProposal("Second proposal");
        await voting.connect(voter4).addProposal("Third proposal");

        await voting.endProposalsRegistering();

        await voting.startVotingSession();

        await voting.connect(voter1).setVote(1);
        await voting.connect(voter2).setVote(1);
        await voting.connect(voter3).setVote(1);
        await voting.connect(voter4).setVote(0);
        await voting.connect(voter5).setVote(2);

    await voting.endVotingSession();

    it('shoul change status to tallied', async function() {
        const event = await voting.tallyVotes();
        await expect(event).to.emit(voting, 'WorkflowStatusChange').withArgs(4,5);
    })

    await voting.tallyVotes();

    });

    it('should the winning Id equals to 1', async function () {
      let winningId = await voting.winningProposalID();
      expect(winningId).to.equal(1);
    });
    
  });
});
