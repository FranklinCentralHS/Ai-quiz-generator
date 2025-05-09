function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
  return passwordRegex.test(password);
}

let quizMode = "instant";
let latestQuizData = [];

function setupUI() {
  setTimeout(() => {
    const savedHeader = document.getElementById("savedQuizzesHeader");
    const formContainer = document.querySelector(".form-container");
    const quizWrapper = document.getElementById("quizOutputWrapper");
    const contactSection = document.getElementById("contactSection");
    const quizContainer = document.getElementById("quizContainer");

    if (localStorage.getItem("userEmail")) {
      document.getElementById("headerBeforeLogin").style.display = "none";
      document.getElementById("loggedInNav").style.display = "block";
    }

    const modeSelect = document.getElementById("modeSelect");
    if (modeSelect) {
      modeSelect.addEventListener("change", (e) => {
        quizMode = e.target.value;
      });
    }

    const generateBtn = document.getElementById("generateBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", async () => {
        const subject = document.getElementById("subjectInput").value.trim();
        const total = parseInt(document.getElementById("questionsInput").value.trim(), 10);
        const grade = document.getElementById("gradeSelect").value;
        const difficulty = document.getElementById("difficultySelect").value;
        const mc = parseInt(document.getElementById("mcInput").value || 0, 10);
        const tf = parseInt(document.getElementById("tfInput").value || 0, 10);
        const ms = parseInt(document.getElementById("msInput").value || 0, 10);
        const warning = document.getElementById("questionTypeWarning");
        const statusMsg = document.getElementById("statusMessage");
        const spinner = document.querySelector(".spinner-wrapper");

        if (!subject || isNaN(total) || !grade || !difficulty) {
          return alert("Fill all fields.");
        }
        if ((mc + tf + ms) !== total) {
          warning.style.display = "block";
          return;
        }

        warning.style.display = "none";
        spinner.classList.add("show");
        statusMsg.style.display = "none";

        try {
          const data = await sendPromptToChatGPT(subject, total, grade, difficulty, mc, tf, ms);
          const valid = Array.isArray(data) && data.length > 0 && data.every(q => q.question && q.options && q.answer);

          if (!valid) throw new Error("Quiz format invalid or empty.");

          latestQuizData = data;
          renderQuiz(data, false);
          statusMsg.textContent = "Quiz generated successfully!";
          statusMsg.style.display = "block";
        } catch (err) {
          console.error("generation error:", err);
          if (!document.querySelector(".quiz-question")) {
            alert("Error generating quiz. Try again.");
          }
        } finally {
          spinner.classList.remove("show");
        }
      });
    }

    document.getElementById("loginBtn")?.addEventListener("click", () => {
      document.getElementById("loginModal").style.display = "block";
    });

    document.getElementById("modalClose")?.addEventListener("click", () => {
      document.getElementById("loginModal").style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target.id === "loginModal") {
        document.getElementById("loginModal").style.display = "none";
      }
    });

    document.getElementById("loginSubmit")?.addEventListener("click", () => {
      const email = document.getElementById("emailInput").value.trim();
      const password = document.getElementById("passwordInput").value.trim();
      if (!isValidEmail(email)) return alert("Invalid email.");
      if (!isValidPassword(password)) return alert("Password needs 1 capital and 1 number.");
      localStorage.setItem("userEmail", email);
      document.getElementById("loginModal").style.display = "none";
      document.getElementById("headerBeforeLogin").style.display = "none";
      document.getElementById("loggedInNav").style.display = "block";
    });

    document.getElementById("signOutBtn")?.addEventListener("click", () => {
      localStorage.removeItem("userEmail");
      location.reload();
    });

    document.getElementById("devLoginBtn")?.addEventListener("click", () => {
      localStorage.setItem("userEmail", "dev@local.test");
      document.getElementById("loginModal").style.display = "none";
      document.getElementById("headerBeforeLogin").style.display = "none";
      document.getElementById("loggedInNav").style.display = "block";
    });

    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID_HERE",
        callback: handleCredentialResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
      );
    }

    // Quizzes tab
    document.getElementById("quizzesNav")?.addEventListener("click", (e) => {
      e.preventDefault();
      formContainer.style.display = "none";
      quizWrapper.style.display = "block";
      contactSection.style.display = "none";
      savedHeader.style.display = "flex";
      savedHeader.style.visibility = "visible";

      quizContainer.innerHTML = "";
      const email = localStorage.getItem("userEmail");
      const quizzes = JSON.parse(localStorage.getItem(`quizzes-${email}`) || "[]");

      if (quizzes.length === 0) {
        quizContainer.innerHTML = "<p class='text-center text-light'>No quizzes saved yet.</p>";
      } else {
        renderQuiz([], true);
      }
    });

    // Generate tab
    document.getElementById("generateNav")?.addEventListener("click", (e) => {
      e.preventDefault();
      formContainer.style.display = "block";
      quizWrapper.style.display = "none";
      quizContainer.innerHTML = "";
      savedHeader.style.display = "none";
      savedHeader.style.visibility = "hidden";
      contactSection.style.display = "none";
    });

    // Contact tab
    document.getElementById("contactNav")?.addEventListener("click", (e) => {
      e.preventDefault();
      formContainer.style.display = "none";
      quizWrapper.style.display = "none";
      savedHeader.style.display = "none";
      savedHeader.style.visibility = "hidden";
      contactSection.style.display = "block";
    });

    document.getElementById("sortSelect")?.addEventListener("change", () => {
      renderQuiz([], true);
    });
  }, 0);
}




if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupUI);
} else {
  setupUI();
}

window.handleCredentialResponse = function (response) {
  const decoded = jwt_decode(response.credential);
  const email = decoded.email || "googleuser@example.com";
  localStorage.setItem("userEmail", email);
  document.getElementById("loginModal").style.display = "none";
  document.getElementById("headerBeforeLogin").style.display = "none";
  document.getElementById("loggedInNav").style.display = "block";
};

function saveQuizForUser() {
  const email = localStorage.getItem("userEmail");
  if (!email || !latestQuizData || latestQuizData.length === 0) {
    return alert("Login and generate a quiz before saving.");
  }
  const existing = JSON.parse(localStorage.getItem(`quizzes-${email}`) || "[]");
  existing.push({ date: Date.now(), data: latestQuizData });
  localStorage.setItem(`quizzes-${email}`, JSON.stringify(existing));
  alert("Quiz saved to your account!");
}

// next thing that needs to be done the exporting of both answer key and the skeloten quiz for teachers to print out
//--------------------------------------------------------------------------------------------
function exportQuizAsPDF(mode) {
  if (!latestQuizData || latestQuizData.length === 0) {
    alert("No quiz data to export.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  if (mode === 'student') {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Student Quiz", 105, y, { align: "center" });
    y += 10;

    // Check if any question is multiple-select (answer is an array)
    const hasMultiSelect = latestQuizData.some(q => Array.isArray(q.answer));

    // Instructions
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Instructions:", 10, y);
    y += 7;
    doc.text("• Circle one option for each question.", 10, y);
    y += 7;
    if (hasMultiSelect) {
      doc.text("• For questions that say 'Select all that apply', you may select more than one.", 10, y);
      y += 7;
    }
    y += 5;

    // Render quiz questions
    latestQuizData.forEach((q, i) => {
      const qNum = i + 1;
      const question = `${qNum}. ${q.question}`;
      const options = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(question, 10, y);
      y += 8;

      options.forEach(opt => {
        doc.text(opt, 15, y);
        y += 8;
      });

      y += 4;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("Student_Quiz.pdf");

  } else if (mode === 'answer') {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Answer Key", 105, y, { align: "center" });
    y += 15;

    latestQuizData.forEach((q, i) => {
      const correctLetters = Array.isArray(q.answer)
        ? q.answer.map(a => q.options.indexOf(a)).map(idx => String.fromCharCode(65 + idx)).join(", ")
        : String.fromCharCode(65 + q.options.indexOf(q.answer));

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`${i + 1}. ${correctLetters}`, 10, y);
      y += 8;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save("Answer_Key.pdf");
  }
}


//-------------------------------------------------------------------------------------------------


// renderQuiz function does all the logic for making the full quiz once the api returns from open ai
// I need to move this whole function to a new js file, this file has too much code and is hard to read
function renderQuiz(quizData, showSaved = false) {
  const formContainer = document.querySelector(".form-container");
  const container = document.getElementById("quizContainer");
  const wrapper = document.getElementById("quizOutputWrapper");
  const savedHeader = document.getElementById("savedQuizzesHeader");

  container.innerHTML = "";
  // make it so the user doesnt have to login over and over again using local storage to auto login for user until
  // the sign out button is pressed on the navbar. 
  const email = localStorage.getItem("userEmail");
  const normalize = str => str.replace(/\s+/g, '').trim();
  // saved quizzes show the quizes saved by the certain user if loged in
  if (showSaved) {
    if (formContainer) formContainer.style.display = "none";
    if (wrapper) wrapper.style.display = "block";
    if (savedHeader) savedHeader.style.display = "none";
    
    // allow sort by A-Z and Z-A. and show the date the quiz was saved. for now using localstorage
    // in the future I will change it so use firebase so user can access the saved quizzes from any browser 
    let quizzes = JSON.parse(localStorage.getItem(`quizzes-${email}`) || "[]");
    const sortType = document.getElementById("sortSelect")?.value || "latest";
    quizzes.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      if (sortType === "az") return nameA.localeCompare(nameB);
      if (sortType === "za") return nameB.localeCompare(nameA);
      return new Date(b.date) - new Date(a.date);
    });
    // If no quizzes are saved, show a message and stop
    if (quizzes.length === 0) {
      container.innerHTML = "<p class='text-center'>No quizzes saved yet.</p>";
      return;
    }
    // Create a grid layout for showing the quiz cards
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
    grid.style.gap = "20px";
    grid.style.marginTop = "20px";
    
    // Loop through each saved quiz and create a card for it
    quizzes.forEach((quiz, index) => {
      const card = document.createElement("div");
      card.className = "quiz-box";

      const header = document.createElement("div");
      header.className = "quiz-header";
      // Allow user to edit the quiz name
      const title = document.createElement("input");
      title.type = "text";
      title.value = quiz.name || `Quiz ${index + 1}`;
      title.className = "form-control mb-2";
      title.style.fontWeight = "bold";
      title.style.flex = "1";
      title.style.marginRight = "10px";
      title.addEventListener("change", () => {
        quiz.name = title.value;
        quizzes[index] = quiz;
        localStorage.setItem(`quizzes-${email}`, JSON.stringify(quizzes));
      });
       // Create the dropdown menu for load, edit notes, and delete
      const dropdown = document.createElement("div");
      dropdown.className = "dropdown";
    
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn-sm btn-light dropdown-toggle";
      toggleBtn.setAttribute("data-bs-toggle", "dropdown");
      toggleBtn.innerText = "Options";

      const menu = document.createElement("ul");
      menu.className = "dropdown-menu dropdown-menu-dark";

      const load = document.createElement("li");
      load.innerHTML = `<a class="dropdown-item" href="#">Load Quiz</a>`;
      load.addEventListener("click", () => {
        latestQuizData = quiz.data;
        if (formContainer) formContainer.style.display = "block";
        if (wrapper) wrapper.style.display = "block";
        if (savedHeader) savedHeader.style.display = "none";
        renderQuiz(quiz.data, false);
      });

      const scrollToNote = document.createElement("li");
      scrollToNote.innerHTML = `<a class="dropdown-item" href="#">Edit Notes</a>`;
      scrollToNote.addEventListener("click", () => {
        note.scrollIntoView({ behavior: "smooth", block: "center" });
        note.focus();
      });

      const del = document.createElement("li");
      del.innerHTML = `<a class="dropdown-item text-danger" href="#">Delete Quiz</a>`;
      del.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this quiz?")) {
          quizzes.splice(index, 1);
          localStorage.setItem(`quizzes-${email}`, JSON.stringify(quizzes));
          renderQuiz([], true);
        }
      });
      // Add dropdown menu items to menu and dropdown to header
      menu.appendChild(load);
      menu.appendChild(scrollToNote);
      menu.appendChild(del);
      dropdown.appendChild(toggleBtn);
      dropdown.appendChild(menu);

      header.appendChild(title);
      header.appendChild(dropdown);
      card.appendChild(header);
          // Show when the quiz was saved
      const meta = document.createElement("p");
      meta.style.fontSize = "0.9rem";
      meta.style.color = "#bbb";
      meta.textContent = `Saved: ${new Date(quiz.date).toLocaleString()}`;
      card.appendChild(meta);
         // Notes section (user can write their own notes)
      const note = document.createElement("textarea");
      note.className = "notes-area";
      note.placeholder = "Add optional notes...";
      note.value = quiz.notes || "";
      note.addEventListener("input", () => {
        quiz.notes = note.value;
        quizzes[index] = quiz;
        localStorage.setItem(`quizzes-${email}`, JSON.stringify(quizzes));
      });
      card.appendChild(note);

      grid.appendChild(card);
    });

    container.appendChild(grid);
    return;
  }

  // If not showing saved quizzes, then show a new quiz that was just generated
  if (formContainer) formContainer.style.display = "block";
  if (wrapper) wrapper.style.display = "block";
  if (container) container.style.display = "block";
  if (savedHeader) savedHeader.style.display = "none";

  container.innerHTML = "";
  const userAnswers = [];
  // Go through each quiz question
  quizData.forEach((q, index) => {
    const isMulti = Array.isArray(q.answer); // check if multiple answers (multi-select)
    const correctAnswers = new Set((isMulti ? q.answer : [q.answer]).map(ans => normalize(ans)));
    const selected = new Set();

    const questionEl = document.createElement("div");
    questionEl.className = "quiz-question";

    const questionText = document.createElement("h5");
    questionText.innerHTML = `Q${index + 1}: ${q.question}`;
    questionEl.appendChild(questionText);

    if (isMulti) {
      const hint = document.createElement("p");
      hint.style.fontStyle = "italic";
      hint.style.color = "#90caf9";
      hint.textContent = "(Select all that apply)";
      questionEl.appendChild(hint);
    }

    const buttons = [];
    q.options.forEach(option => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.className = "option-btn button-main m-1";
      const optionKey = normalize(option);
      // For instant answer mode: show feedback immediately
      if (quizMode === "instant") {
        if (isMulti) {
          btn.addEventListener("click", () => {
            const max = correctAnswers.size;
            if (btn.classList.contains("selected")) {
              btn.classList.remove("selected");
              selected.delete(optionKey);
            } else {
              if (selected.size < max) {
                btn.classList.add("selected");
                selected.add(optionKey);
              } else {
                alert(`Select up to ${max} option${max > 1 ? "s" : ""}.`);
              }
            }
          });
        } else {
          btn.addEventListener("click", () => {
            buttons.forEach(b => {
              b.disabled = true;
              if (normalize(b.textContent) === [...correctAnswers][0]) {
                b.style.backgroundColor = "#4caf50";
              }
            });
            if (!correctAnswers.has(optionKey)) btn.style.backgroundColor = "#f44336";
            else btn.style.backgroundColor = "#4caf50";
            selected.add(optionKey);
            userAnswers[index].wasCorrect = correctAnswers.has(optionKey);
          });
        }
      } else {
          // For test mode: user selects options but no feedback until submit
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          if (isMulti) {
            const max = correctAnswers.size;
            if (btn.classList.contains("selected")) {
              btn.classList.remove("selected");
              selected.delete(optionKey);
            } else {
              if (selected.size < max) {
                btn.classList.add("selected");
                selected.add(optionKey);
              } else {
                alert(`Select up to ${max} option${max > 1 ? "s" : ""}.`);
              }
            }
          } else {
            selected.clear();
            selected.add(optionKey);
            buttons.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
          }
        });
      }

      buttons.push(btn);
      questionEl.appendChild(btn);
    });

    userAnswers.push({ question: q, selected, questionEl });
    // For multi-select instant mode: add submit button for each question
    if (quizMode === "instant" && isMulti) {
      const submit = document.createElement("button");
      submit.textContent = "Submit Answer";
      submit.className = "button-main m-2";
      submit.addEventListener("click", () => {
        if (selected.size === 0) return alert("Select at least one.");
        let correctCount = 0;
        buttons.forEach(btn => {
          const key = normalize(btn.textContent);
          const isCorrect = correctAnswers.has(key);
          const isSelected = selected.has(key);
          btn.classList.remove("selected");
          btn.disabled = true;

          if (isSelected && isCorrect) {
            btn.style.backgroundColor = "#4caf50";
            correctCount++;
          } else if (isSelected && !isCorrect) {
            btn.style.backgroundColor = "#f44336";
          } else if (!isSelected && isCorrect) {
            btn.style.backgroundColor = "#4caf50";
            btn.style.opacity = "0.85";
          } else {
            btn.style.backgroundColor = "#9e9e9e";
          }
        });

        const scoreText = document.createElement("span");
        scoreText.textContent = `Correct: ${correctCount} / ${correctAnswers.size}`;
        submit.insertAdjacentElement("afterend", scoreText);
        submit.disabled = true;
        userAnswers[index].wasCorrect = correctCount === correctAnswers.size;
      });
      questionEl.appendChild(submit);
    }

    container.appendChild(questionEl);
  });
  // Create score summary section
  const summary = document.createElement("div");
  summary.className = "d-flex justify-content-center align-items-center mt-4 gap-3 flex-wrap";
  // Show "Finish & Show Score" for instant mode
  if (quizMode === "instant") {
    const scoreBtn = document.createElement("button");
    scoreBtn.textContent = "Finish & Show Score";
    scoreBtn.className = "button-main m-2";

    const scoreDisplay = document.createElement("div");
    scoreDisplay.className = "score-text";
    scoreDisplay.style.minWidth = "120px";

    scoreBtn.addEventListener("click", () => {
      const correct = userAnswers.filter(a => a.wasCorrect).length;
      const percent = Math.round((correct / userAnswers.length) * 100);
      scoreDisplay.textContent = `Score: ${correct} / ${userAnswers.length} (${percent}%)`;
    });

    summary.appendChild(scoreBtn);
    summary.appendChild(scoreDisplay);
  }

  // For test mode, user submits all at once and sees final score
  if (quizMode === "test") {
    const submitAll = document.createElement("button");
    submitAll.textContent = "Submit All Answers";
    submitAll.className = "button-main m-3";

    const finalScore = document.createElement("span");
    finalScore.className = "score-text";

    submitAll.addEventListener("click", () => {
      let score = 0;
      userAnswers.forEach(({ question, selected, questionEl }) => {
        const correct = Array.isArray(question.answer)
          ? new Set(question.answer.map(ans => normalize(String(ans))))
          : new Set([normalize(String(question.answer))]);

        const isCorrect =
          selected.size > 0 &&
          correct.size === selected.size &&
          [...correct].every(ans => selected.has(ans));

        if (isCorrect) score++;

        const buttons = questionEl.querySelectorAll("button.option-btn");
        buttons.forEach(btn => {
          const key = normalize(btn.textContent);
          const isSel = selected.has(key);
          const isCorr = correct.has(key);
          btn.disabled = true;
          btn.classList.remove("selected");

          if (isSel && isCorr) btn.style.backgroundColor = "#4caf50";
          else if (isSel && !isCorr) btn.style.backgroundColor = "#f44336";
          else if (!isSel && isCorr) {
            btn.style.backgroundColor = "#4caf50";
            btn.style.opacity = "0.85";
          } else {
            btn.style.backgroundColor = "#9e9e9e";
          }
        });
      });
      // round the percentge to nearest whole number. 
      const percent = Math.round((score / userAnswers.length) * 100);
      finalScore.textContent = `Score: ${score} / ${userAnswers.length} (${percent}%)`;
      submitAll.disabled = true;
    });
    // show the final score. 
    summary.appendChild(submitAll);
    summary.appendChild(finalScore);
  }

  container.appendChild(summary);
  // Show extra tools like Download Quiz, Download Answer Key, Save Quiz
  const tools = document.createElement("div");
  tools.className = "d-flex justify-content-center flex-wrap mt-3 gap-2";
  // show buttons like save quiz, down answer key, and download teacher quiz answers. 
  const studentBtn = document.createElement("button");
  studentBtn.className = "button-main";
  studentBtn.textContent = "Download Student Quiz";
  studentBtn.onclick = () => exportQuizAsPDF("student");

  const keyBtn = document.createElement("button");
  keyBtn.className = "button-main";
  keyBtn.textContent = "Download Answer Key";
  keyBtn.onclick = () => exportQuizAsPDF("answer");

  const saveBtn = document.createElement("button");
  saveBtn.className = "button-main";
  saveBtn.textContent = "Save Quiz";
  saveBtn.onclick = saveQuizForUser;

  tools.appendChild(studentBtn);
  tools.appendChild(keyBtn);
  tools.appendChild(saveBtn);
  container.appendChild(tools);
}
