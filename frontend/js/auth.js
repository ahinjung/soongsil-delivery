
const Auth = {
    API_URL: "http://localhost:3000/api",

    // 로그인 토큰 가져오기
    getToken() {
    return localStorage.getItem("authToken") ||
           sessionStorage.getItem("authToken");
},

    // 서버에 데이터 요청
    async request(endpoint, method = "GET", body = null) {
        const headers = {
            "Content-Type": "application/json"
        };

        const token = this.getToken();

        if (token) {
            headers.Authorization = "Bearer " + token;
        }

        const options = {
            method: method,
            headers: headers
        };

        if (body !== null) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(
            this.API_URL + endpoint,
            options
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "요청에 실패했습니다."
            );
        }

        return result;
    },

    // 회원가입
    async signup(email, password, nickname) {
        try {
            return await this.request("/signup", "POST", {
                email,
                password,
                nickname
            });
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },

    // 로그인
async login(email, password, remember = false) {
    try {
        const result = await this.request("/login", "POST", {
            email,
            password
        });

        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");

        if (remember) {
            localStorage.setItem("authToken", result.token);
        } else {
            sessionStorage.setItem("authToken", result.token);
        }

        return result;

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
},

    // 현재 로그인한 사용자 조회
    async getCurrentUser() {
        if (!this.getToken()) {
            return null;
        }

        try {
            return await this.request("/users/me");
        } catch (error) {
            return null;
        }
    },

    // 프로필 수정
    async updateProfile(nickname, profileImage) {
        const body = { nickname };

        if (profileImage !== undefined && profileImage !== null) {
            body.profileImage = profileImage;
        }

        return await this.request("/users/me", "PATCH", body);
    },

    // 내가 모집한 주문
    async getCreatedOrders() {
        return await this.request("/users/me/posts");
    },

    // 내가 참여한 주문
    async getJoinedOrders() {
        return await this.request("/users/me/joined");
    },

    // 로그아웃
    async logout() {
        try {
            await this.request("/logout", "POST");
        } finally {
            localStorage.removeItem("authToken");
            sessionStorage.removeItem("authToken");
            window.location.href = "login.html";
        }
    },

    // 회원 탈퇴
    async deleteAccount() {
        const result = await this.request(
            "/users/me",
            "DELETE"
        );

        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");

        return result;
    }
};
