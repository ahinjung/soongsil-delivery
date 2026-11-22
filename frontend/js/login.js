
// 로그인 및 회원가입 화면 동작

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

loginTab.addEventListener("click", function () {
    switchTab("login");
});

signupTab.addEventListener("click", function () {
    switchTab("signup");
});

switchTab("login");

// 회원가입 처리
signupForm.addEventListener("submit", async function (event) {
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

    // 닉네임 검사
    if (nickname.length < 2 || nickname.length > 8) {
        showMessage("닉네임은 2~8자로 입력해주세요.");
        return;
    }

    // 비밀번호 조건 검사
    if (
        password.length < 8 ||
        password.length > 20 ||
        !/[a-zA-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^a-zA-Z0-9\s]/.test(password)
    ) {
        showMessage(
            "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다."
        );
        return;
    }

    // 비밀번호 일치 확인
    if (password !== confirmPassword) {
        showMessage("비밀번호가 일치하지 않습니다.");
        return;
    }

    const submitBtn = signupForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    try {
        // 서버에 회원가입 요청
        const result = await Auth.signup(
            email,
            password,
            nickname
        );

        if (!result.success) {
            showMessage(result.message);
            return;
        }

        signupForm.reset();
        switchTab("login");
        showMessage(result.message, "success");

    } catch (error) {
        showMessage("회원가입 중 오류가 발생했습니다.");
    } finally {
        submitBtn.disabled = false;
    }
});

// 로그인 처리
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail")
        .value.trim().toLowerCase();

    const password = document.getElementById("loginPassword").value;

    const submitBtn = loginForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    try {
        // 서버에 로그인 요청
        const remember =
            document.getElementById("rememberLogin").checked;

        const result = await Auth.login(
            email,
            password,
            remember
);

        if (!result.success) {
            showMessage(result.message);
            return;
        }

        showMessage(result.message, "success");

        // 로그인 성공 시 메인 페이지 이동
        window.location.href = "index.html";

    } catch (error) {
        showMessage("로그인 중 오류가 발생했습니다.");
    } finally {
        submitBtn.disabled = false;
    }
});

async function checkAutoLogin() {
    const user = await Auth.getCurrentUser();

    if (user) {
        window.location.replace("index.html");
    }
}

checkAutoLogin();