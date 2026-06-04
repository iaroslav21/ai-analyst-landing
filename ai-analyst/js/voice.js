/**
 * Voce: Speech-to-Text + Text-to-Speech
 * Funcționează cu Web Speech API (Chrome, Edge, Safari)
 */
(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SpeechSynthesis = window.speechSynthesis;

  if (!SpeechRecognition) {
    console.warn("Speech Recognition nu este suportat în acest browser");
  }

  let recognition = SpeechRecognition ? new SpeechRecognition() : null;
  let isListening = false;

  // Configurare recunoaștere vocală
  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "ro-RO";

    recognition.onstart = function () {
      isListening = true;
      document.querySelectorAll(".voice-btn").forEach((btn) => {
        if (btn.dataset.active) btn.classList.add("listening");
      });
    };

    recognition.onresult = function (event) {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const field = document.querySelector("[data-voice-input]");
          if (field) {
            field.value = (field.value + " " + transcript).trim();
            field.dispatchEvent(new Event("input"));
          }
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        const field = document.querySelector("[data-voice-input]");
        if (field) {
          field.placeholder = interim;
        }
      }
    };

    recognition.onend = function () {
      isListening = false;
      document.querySelectorAll(".voice-btn").forEach((btn) => {
        btn.classList.remove("listening");
      });
    };

    recognition.onerror = function (event) {
      console.error("Voce:", event.error);
    };
  }

  // Text-to-Speech
  function speak(text, lang = "ro-RO") {
    if (!SpeechSynthesis) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    speechSynthesis.speak(utterance);
  }

  // Buton pentru înregistrare
  function createVoiceButton(inputId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "voice-btn";
    btn.title = "Înregistrare vocală";
    btn.innerHTML = "🎤";
    btn.dataset.inputId = inputId;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!recognition) {
        alert("Recunoașterea vocală nu este suportată în acest browser");
        return;
      }
      if (isListening) {
        recognition.stop();
      } else {
        const field = document.getElementById(inputId);
        document.querySelectorAll("[data-voice-input]").forEach((f) => {
          f.removeAttribute("data-voice-input");
        });
        if (field) {
          field.setAttribute("data-voice-input", "true");
          field.focus();
          recognition.start();
          btn.dataset.active = "true";
        }
      }
    });

    return btn;
  }

  // Inițializare după DOM
  document.addEventListener("DOMContentLoaded", () => {
    // Chat input
    const chatInput = document.getElementById("chatInput");
    if (chatInput && SpeechRecognition) {
      const voiceBtn = createVoiceButton("chatInput");
      voiceBtn.style.marginLeft = "8px";
      chatInput.parentElement.insertBefore(voiceBtn, chatInput.nextSibling);
    }

    // Lead form inputs
    ["fName", "fEmail", "fCompany", "fMessage"].forEach((id) => {
      const field = document.getElementById(id);
      if (field && SpeechRecognition) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        field.parentElement.replaceChild(wrapper, field);
        wrapper.appendChild(field);
        wrapper.appendChild(createVoiceButton(id));
      }
    });

    // Checkout form inputs
    [
      "chkName",
      "chkEmail",
      "chkPhone",
      "chkCompany",
      "chkCard",
      "chkCardName",
      "chkAddress",
    ].forEach((id) => {
      const field = document.getElementById(id);
      if (field && SpeechRecognition) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        field.parentElement.replaceChild(wrapper, field);
        wrapper.appendChild(field);
        wrapper.appendChild(createVoiceButton(id));
      }
    });
  });

  // Expune funcțiile global
  window.VoiceAssistant = {
    speak,
    startListening: () => recognition && recognition.start(),
    stopListening: () => recognition && recognition.stop(),
  };
})();
