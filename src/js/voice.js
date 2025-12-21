// Voice Input using Web Speech API
const Voice = {
  recognition: null,
  isListening: false,

  // Initialize speech recognition
  init() {
    // Check for browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.showListening();
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.handleVoiceInput(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.hideListening();
      UI.showStatus("Voice input error: " + event.error, "error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.hideListening();
    };

    return true;
  },

  // Start listening
  startListening() {
    if (!this.recognition) {
      UI.showStatus("Voice input not supported in this browser", "error");
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      UI.showStatus("Could not start voice input", "error");
    }
  },

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  },

  // Handle voice input
  handleVoiceInput(transcript) {
    console.log("Voice input:", transcript);

    // Clean up transcript (remove "add" prefix if present)
    let itemName = transcript.trim();
    if (itemName.toLowerCase().startsWith("add ")) {
      itemName = itemName.substring(4);
    }

    // Set the item input
    const itemInput = document.getElementById("itemInput");
    if (itemInput) {
      itemInput.value = itemName;
      itemInput.focus();

      // Show category select
      const categorySelect = document.getElementById("categorySelect");
      if (categorySelect) {
        categorySelect.focus();
      }

      UI.showStatus(`Got it: "${itemName}". Now select a category.`, "success");
    }
  },

  // Show listening indicator
  showListening() {
    const indicator = document.getElementById("voiceIndicator");
    const voiceBtn = document.getElementById("voiceBtn");

    if (indicator) {
      indicator.classList.remove("hidden");
    }

    if (voiceBtn) {
      voiceBtn.classList.add("listening");
    }
  },

  // Hide listening indicator
  hideListening() {
    const indicator = document.getElementById("voiceIndicator");
    const voiceBtn = document.getElementById("voiceBtn");

    if (indicator) {
      indicator.classList.add("hidden");
    }

    if (voiceBtn) {
      voiceBtn.classList.remove("listening");
    }
  },

  // Check if supported
  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },
};
