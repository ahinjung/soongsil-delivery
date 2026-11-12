
/* 로그인 및 회원가입 화면 동작 */

// HTML 요소 가져오기
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const message = document.getElementById("message");

// 메시지 출력
function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = type;
}

// 로그인 / 회원가입 탭 전환
function switchTab(tab) {
    const isLogin = tab === "login";

    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;

    loginTab.classList.toggle("active", isLogin);
    signupTab.classList.toggle("active", !isLogin);

    showMessage("");
}

loginTab.addEventListener("click", function() {
    switchTab("login");
});

signupTab.addEventListener("click", function() {
    switchTab("signup");
});

// 처음에는 로그인 화면 표시
switchTab("login");

// 회원가입 처리
signupForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("signupEmail")
        .value.trim().toLowerCase();

    const nickname = document.getElementById("signupNickname")
        .value.trim();

    const password = document.getElementById("signupPassword").value;

    const confirmPassword = document.getElementById("confirmPassword")
        .value;

    // 이메일 형식 검사
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showMessage("올바른 이메일 형식을 입력하세요.");
        return;
    }

    // 닉네임 길이 검사
    if (nickname.length < 2 || nickname.length > 8) {
        showMessage("닉네임은 2~8자로 입력해주세요.");
        return;
    }

    // 비밀번호 길이 검사
    if (password.length < 8 || password.length > 20) {
        showMessage("비밀번호는 8~20자로 입력해주세요.");
        return;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
        showMessage("비밀번호가 일치하지 않습니다.");
        return;
    }

    // 회원가입 실행
    const result = Auth.signup(email, password, nickname);

    if (!result.success) {
        showMessage(result.message);
        return;
    }

    // 회원가입 성공
    signupForm.reset();
    switchTab("login");
    showMessage(result.message, "success");
});

// 로그인 처리
loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail")
        .value.trim().toLowerCase();

    const password = document.getElementById("loginPassword").value;

    const result = Auth.login(email, password);

    if (!result.success) {
        showMessage(result.message);
        return;
    }

    showMessage(result.message, "success");

    // 로그인 성공 시 마이페이지로 이동
    window.location.href = "mypage.html";
});
