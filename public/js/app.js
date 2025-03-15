// Variables globales
let socket;
let jitsiApi;
let roomId;
let userId;
let userName;

// Éléments DOM
const roomControls = document.getElementById('room-controls');
const meetingContainer = document.getElementById('meeting-container');
const roomNameInput = document.getElementById('room-name');
const userNameInput = document.getElementById('user-name');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const jitsiContainer = document.getElementById('jitsi-container');
const voteQuestion = document.getElementById('vote-question');
const voteOptions = document.getElementById('vote-options');
const addOptionBtn = document.getElementById('add-option-btn');
const createVoteBtn = document.getElementById('create-vote-btn');
const votesList = document.getElementById('votes-list');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser Socket.IO
    socket = io();
    
    // Écouteurs d'événements
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    addOptionBtn.addEventListener('click', addVoteOption);
    createVoteBtn.addEventListener('click', createVote);
    
    // Écouteurs d'événements Socket.IO
    setupSocketListeners();
});

// Configuration des écouteurs Socket.IO
function setupSocketListeners() {
    socket.on('vote-created', (voteData) => {
        displayVote(voteData);
    });
    
    socket.on('vote-updated', (voteData) => {
        updateVoteDisplay(voteData);
    });
    
    socket.on('vote-ended', (voteData) => {
        markVoteAsEnded(voteData);
    });
    
    socket.on('current-votes', (votes) => {
        votes.forEach(vote => {
            displayVote(vote);
        });
    });
    
    socket.on('user-joined', (newUserId) => {
        console.log(`L'utilisateur ${newUserId} a rejoint la salle`);
    });
}

// Créer une nouvelle salle
function createRoom() {
    if (!validateInputs()) return;
    
    roomId = roomNameInput.value.trim();
    userName = userNameInput.value.trim();
    userId = generateUserId();
    
    initializeJitsiMeet();
    joinSocketRoom();
}

// Rejoindre une salle existante
function joinRoom() {
    if (!validateInputs()) return;
    
    roomId = roomNameInput.value.trim();
    userName = userNameInput.value.trim();
    userId = generateUserId();
    
    initializeJitsiMeet();
    joinSocketRoom();
}

// Valider les entrées utilisateur
function validateInputs() {
    if (!roomNameInput.value.trim()) {
        alert('Veuillez entrer un nom de salle');
        return false;
    }
    
    if (!userNameInput.value.trim()) {
        alert('Veuillez entrer votre nom');
        return false;
    }
    
    return true;
}

// Initialiser Jitsi Meet
function initializeJitsiMeet() {
    // Cacher les contrôles de salle et afficher le conteneur de réunion
    roomControls.style.display = 'none';
    meetingContainer.style.display = 'block';
    
    // Options pour l'API Jitsi Meet
    const options = {
        roomName: roomId,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainer,
        userInfo: {
            displayName: userName
        },
        configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            disableThirdPartyRequests: true,
            disableLocalVideoFlip: true,
            analytics: {
                disabled: true
            },
            // Désactiver l'authentification
            enableClosePage: false,
            enableWelcomePage: false,
            requireDisplayName: false,
            enableCalendarIntegration: false,
            googleApiApplicationClientID: '',
            microsoftApiApplicationClientID: '',
            // Désactiver les extensions
            disableThirdPartyRequests: true,
            disablePlugins: true
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                'security'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#3498db',
            // Désactiver les invitations par email et autres intégrations
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            MOBILE_APP_PROMO: false,
            DISABLE_FOCUS_INDICATOR: true,
            DISABLE_VIDEO_BACKGROUND: true,
            DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
            DISABLE_TRANSCRIPTION_SUBTITLES: false
        }
    };
    
    // Initialiser l'API Jitsi Meet
    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', options);
    
    // Écouteurs d'événements Jitsi Meet
    jitsiApi.addEventListeners({
        videoConferenceJoined: handleVideoConferenceJoined,
        participantJoined: handleParticipantJoined,
        participantLeft: handleParticipantLeft
    });
}

// Rejoindre la salle Socket.IO
function joinSocketRoom() {
    socket.emit('join-room', roomId, userId);
}

// Gérer l'événement de connexion à la visioconférence
function handleVideoConferenceJoined(event) {
    console.log('Vous avez rejoint la visioconférence', event);
}

// Gérer l'événement d'un participant qui rejoint
function handleParticipantJoined(event) {
    console.log('Un participant a rejoint', event);
}

// Gérer l'événement d'un participant qui quitte
function handleParticipantLeft(event) {
    console.log('Un participant a quitté', event);
}

// Ajouter une option de vote
function addVoteOption() {
    const newOption = document.createElement('input');
    newOption.type = 'text';
    newOption.className = 'vote-option';
    newOption.placeholder = `Option ${voteOptions.childElementCount + 1}`;
    voteOptions.appendChild(newOption);
}

// Créer un nouveau vote
function createVote() {
    const question = voteQuestion.value.trim();
    if (!question) {
        alert('Veuillez entrer une question pour le vote');
        return;
    }
    
    const options = [];
    const optionInputs = voteOptions.querySelectorAll('.vote-option');
    
    optionInputs.forEach(input => {
        const optionText = input.value.trim();
        if (optionText) {
            options.push(optionText);
        }
    });
    
    if (options.length < 2) {
        alert('Veuillez entrer au moins deux options pour le vote');
        return;
    }
    
    const voteData = {
        question,
        options,
        userId
    };
    
    socket.emit('create-vote', roomId, voteData);
    
    // Réinitialiser le formulaire
    voteQuestion.value = '';
    voteOptions.innerHTML = '';
    addVoteOption();
    addVoteOption();
}

// Afficher un vote
function displayVote(voteData) {
    const voteCard = document.createElement('div');
    voteCard.className = 'vote-card';
    voteCard.id = `vote-${voteData.id}`;
    
    const voteHeader = document.createElement('h4');
    voteHeader.textContent = voteData.question;
    
    const voteOptionsDiv = document.createElement('div');
    voteOptionsDiv.className = 'vote-options';
    
    voteData.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.className = 'vote-option-btn';
        optionBtn.textContent = option;
        optionBtn.addEventListener('click', () => {
            submitVote(voteData.id, index);
        });
        voteOptionsDiv.appendChild(optionBtn);
    });
    
    const voteResultsDiv = document.createElement('div');
    voteResultsDiv.className = 'vote-results';
    voteResultsDiv.id = `results-${voteData.id}`;
    
    const voteActions = document.createElement('div');
    voteActions.className = 'vote-actions';
    
    if (voteData.createdBy === userId) {
        const endVoteBtn = document.createElement('button');
        endVoteBtn.textContent = 'Terminer le vote';
        endVoteBtn.addEventListener('click', () => {
            endVote(voteData.id);
        });
        voteActions.appendChild(endVoteBtn);
    }
    
    voteCard.appendChild(voteHeader);
    voteCard.appendChild(voteOptionsDiv);
    voteCard.appendChild(voteResultsDiv);
    voteCard.appendChild(voteActions);
    
    votesList.appendChild(voteCard);
    
    // Mettre à jour l'affichage des résultats
    updateVoteResults(voteData);
}

// Soumettre un vote
function submitVote(voteId, optionIndex) {
    socket.emit('submit-vote', roomId, voteId, userId, optionIndex);
}

// Terminer un vote
function endVote(voteId) {
    socket.emit('end-vote', roomId, voteId);
}

// Mettre à jour l'affichage d'un vote
function updateVoteDisplay(voteData) {
    updateVoteResults(voteData);
    
    // Mettre en évidence l'option choisie par l'utilisateur
    const voteCard = document.getElementById(`vote-${voteData.id}`);
    if (voteCard) {
        const optionBtns = voteCard.querySelectorAll('.vote-option-btn');
        optionBtns.forEach((btn, index) => {
            if (voteData.votes[userId] === index) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }
}

// Marquer un vote comme terminé
function markVoteAsEnded(voteData) {
    const voteCard = document.getElementById(`vote-${voteData.id}`);
    if (voteCard) {
        voteCard.classList.add('vote-ended');
        
        const optionBtns = voteCard.querySelectorAll('.vote-option-btn');
        optionBtns.forEach(btn => {
            btn.disabled = true;
        });
        
        const endVoteBtn = voteCard.querySelector('.vote-actions button');
        if (endVoteBtn) {
            endVoteBtn.remove();
        }
        
        const endedLabel = document.createElement('p');
        endedLabel.textContent = 'Vote terminé';
        endedLabel.className = 'vote-ended-label';
        voteCard.querySelector('.vote-actions').appendChild(endedLabel);
    }
    
    updateVoteResults(voteData);
}

// Mettre à jour l'affichage des résultats d'un vote
function updateVoteResults(voteData) {
    const resultsDiv = document.getElementById(`results-${voteData.id}`);
    if (!resultsDiv) return;
    
    // Compter les votes
    const voteCounts = Array(voteData.options.length).fill(0);
    let totalVotes = 0;
    
    for (const userId in voteData.votes) {
        const optionIndex = voteData.votes[userId];
        voteCounts[optionIndex]++;
        totalVotes++;
    }
    
    // Vider le conteneur de résultats
    resultsDiv.innerHTML = '';
    
    // Afficher les résultats
    if (totalVotes > 0) {
        voteData.options.forEach((option, index) => {
            const percentage = (voteCounts[index] / totalVotes) * 100;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'vote-result-item';
            
            const resultLabel = document.createElement('div');
            resultLabel.className = 'vote-result-label';
            resultLabel.textContent = `${option}: ${voteCounts[index]} vote(s)`;
            
            const voteBar = document.createElement('div');
            voteBar.className = 'vote-bar';
            
            const voteBarFill = document.createElement('div');
            voteBarFill.className = 'vote-bar-fill';
            voteBarFill.style.width = `${percentage}%`;
            
            voteBar.appendChild(voteBarFill);
            resultItem.appendChild(resultLabel);
            resultItem.appendChild(voteBar);
            
            resultsDiv.appendChild(resultItem);
        });
    } else {
        const noVotesMsg = document.createElement('p');
        noVotesMsg.textContent = 'Aucun vote pour le moment';
        resultsDiv.appendChild(noVotesMsg);
    }
}

// Générer un ID utilisateur unique
function generateUserId() {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
