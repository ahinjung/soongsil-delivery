
/* 회원 정보 및 로그인 상태 관리 (시연용) */

const Auth = {
    // 회원 정보 목록 불러오기
    getUsers() {
        return JSON.parse(localStorage.getItem("users") || "[]");
    },

    // 회원가입
    signup(email, password, nickname) {
        const users = this.getUsers();

        // 이메일 중복 검사
        if (users.some(user => user.email === email)) {
            return {
                success: false,
                message: "이미 가입된 이메일입니다."
            };
        }

        const newUser = {
            id: Date.now().toString(),
            email: email,
            password: password,
            nickname: nickname,
            profileImage: "images/default-profile.png"
        };

        users.push(newUser);

        localStorage.setItem("users", JSON.stringify(users));

        return {
            success: true,
            message: "회원가입이 완료되었습니다."
        };
    },

    // 로그인
    login(email, password) {
        const users = this.getUsers();

        const user = users.find(
            user => user.email === email &&
                    user.password === password
        );

        if (!user) {
            return {
                success: false,
                message: "이메일 또는 비밀번호가 올바르지 않습니다."
            };
        }

        // 로그인 상태 저장 (비밀번호 제외)
        sessionStorage.setItem("currentUserId", user.id);

        return {
            success: true,
            message: "로그인 성공!"
        };
    },

    // 로그인한 사용자 정보
    getCurrentUser() {
        const userId = sessionStorage.getItem("currentUserId");

        if (!userId) {
            return null;
        }

        const user = this.getUsers().find(
            user => user.id === userId
        );

        if (!user) {
            return null;
        }

        // 비밀번호 반환 X
        const { password, ...safeUser } = user;
        return safeUser;
    },

    // 로그아웃
    logout() {
        sessionStorage.removeItem("currentUserId");
        window.location.href = "login.html";
    }
};
