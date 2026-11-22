
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 데이터 저장 파일
const DATA_FILE = path.join(__dirname, "data.json");

// 데이터 불러오기
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }

    return {
        users: [],
        posts: [],
        sessions: [],
        nextId: 1
    };
}

let data = loadData();

// 데이터 파일에 저장
function saveData() {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

saveData();

// 비밀번호 암호화
function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}

// 비밀번호 정보를 제외한 회원 정보 반환
function safeUser(user) {
    return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImage: user.profileImage
    };
}

// 로그인 인증 확인
function requireAuth(req, res, next) {
    const token = (req.headers.authorization || "")
        .replace(/^Bearer /, "");

    const session = data.sessions.find(
        s => s.token === token && s.expiresAt > Date.now()
    );

    if (!session) {
        return res.status(401).json({
            message: "로그인이 필요합니다."
        });
    }

    const user = data.users.find(
        u => u.id === session.userId
    );

    if (!user) {
        return res.status(401).json({
            message: "회원 정보를 찾을 수 없습니다."
        });
    }

    req.user = user;
    req.token = token;
    next();
}

// 회원가입
app.post("/api/signup", (req, res) => {
    const { email, password, nickname } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof nickname !== "string"
    ) {
        return res.status(400).json({
            message: "모든 항목을 입력해주세요."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNickname = nickname.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({
            message: "올바른 이메일을 입력해주세요."
        });
    }

    if (
        normalizedNickname.length < 2 ||
        normalizedNickname.length > 8
    ) {
        return res.status(400).json({
            message: "닉네임은 2~8자로 입력해주세요."
        });
    }

    if (
        password.length < 8 ||
        password.length > 20 ||
        !/[a-zA-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^a-zA-Z0-9\s]/.test(password)
    ) {
        return res.status(400).json({
            message: "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다."
        });
    }

    if (data.users.some(u => u.email === normalizedEmail)) {
        return res.status(409).json({
            message: "이미 가입된 이메일입니다."
        });
    }

    const salt = crypto.randomBytes(16).toString("hex");

    const newUser = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        nickname: normalizedNickname,
        passwordHash: hashPassword(password, salt),
        salt: salt,
        profileImage: "",
        createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    saveData();

    res.status(201).json({
        success: true,
        message: "회원가입이 완료되었습니다."
    });
});

// 로그인
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        password.length > 20
    ) {
        return res.status(400).json({
            message: "이메일과 비밀번호를 입력해주세요."
        });
    }

    const user = data.users.find(
        u => u.email === email.trim().toLowerCase()
    );

    if (
        !user ||
        user.passwordHash !== hashPassword(password, user.salt)
    ) {
        return res.status(401).json({
            message: "이메일 또는 비밀번호가 올바르지 않습니다."
        });
    }

    const token = crypto.randomBytes(32).toString("hex");

    data.sessions = data.sessions.filter(
        s => s.expiresAt > Date.now()
    );

    data.sessions.push({
        userId: user.id,
        token: token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    saveData();

    res.json({
        success: true,
        message: "로그인 성공!",
        token: token,
        user: safeUser(user)
    });
});

// 현재 로그인한 회원 정보 조회
app.get("/api/users/me", requireAuth, (req, res) => {
    res.json(safeUser(req.user));
});

// 프로필 수정
app.patch("/api/users/me", requireAuth, (req, res) => {
    const { nickname, profileImage } = req.body;

    if (
        typeof nickname !== "string" ||
        nickname.trim().length < 2 ||
        nickname.trim().length > 8
    ) {
        return res.status(400).json({
            message: "닉네임은 2~8자로 입력해주세요."
        });
    }

    if (profileImage !== undefined) {
        if (
            typeof profileImage !== "string" ||
            !/^data:image\/(jpeg|png);base64,/.test(profileImage) ||
            Buffer.from(profileImage.split(",")[1], "base64").length >
                5 * 1024 * 1024
        ) {
            return res.status(400).json({
                message: "5MB 이하의 JPG 또는 PNG 이미지만 가능합니다."
            });
        }

        req.user.profileImage = profileImage;
    }

    req.user.nickname = nickname.trim();

    saveData();

    res.json({
        success: true,
        message: "프로필이 수정되었습니다.",
        user: safeUser(req.user)
    });
});

// 로그아웃
app.post("/api/logout", requireAuth, (req, res) => {
    data.sessions = data.sessions.filter(
        s => s.token !== req.token
    );

    saveData();

    res.json({
        success: true,
        message: "로그아웃되었습니다."
    });
});

// 회원 탈퇴
app.delete("/api/users/me", requireAuth, (req, res) => {
    const userId = req.user.id;

    const activeOrder = data.posts.some(post =>
        (
            post.creatorId === userId ||
            (post.participantIds || []).includes(userId)
        ) &&
        !["완료", "취소"].includes(post.status)
    );

    if (activeOrder) {
        return res.status(400).json({
            message: "진행 중인 주문이 있어 탈퇴할 수 없습니다."
        });
    }

    data.users = data.users.filter(u => u.id !== userId);

    data.sessions = data.sessions.filter(
        s => s.userId !== userId
    );

    saveData();

    res.json({
        success: true,
        message: "회원 탈퇴가 완료되었습니다."
    });
});

// 내가 모집한 주문 조회
app.get("/api/users/me/posts", requireAuth, (req, res) => {
    const posts = data.posts
        .filter(post => post.creatorId === req.user.id)
        .sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

    res.json(posts);
});

// 내가 참여한 주문 조회
app.get("/api/users/me/joined", requireAuth, (req, res) => {
    const posts = data.posts
        .filter(post =>
            (post.participantIds || []).includes(req.user.id) &&
            post.creatorId !== req.user.id
        )
        .sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

    res.json(posts);
});

// 기존 모집글 관련 설정
const allowedBuildings = [
    "정보과학관",
    "형남공학관",
    "조만식기념관",
    "베어드홀",
    "미래관",
    "진리관",
    "숭덕경상관",
    "문화관",
    "안익태기념관",
    "중앙도서관",
    "학생회관",
    "신양관",
    "레지던스홀(기숙사)"
];

const allowedStatuses = ["모집 중", "마감", "완료"];

// 모집글 전체 조회
app.get("/api/posts", (req, res) => {
    res.json(data.posts);
});

// 모집글 등록
app.post("/api/posts", requireAuth, (req, res) => {
    const {
        category,
        title,
        location,
        deadlineTime,
        orderTime,
        maxParticipants,
        settlementType,
        approvalType,
        minAmount,
        maxAmount,
        status
    } = req.body;

    if (
        !category || !title || !location ||
        !deadlineTime || !orderTime || !maxParticipants
    ) {
        return res.status(400).json({
            message: "필수 항목을 모두 입력해 주세요."
        });
    }

    if (!allowedBuildings.includes(location)) {
        return res.status(400).json({
            message: "숭실대 건물 목록에서 장소를 골라주세요."
        });
    }

    if (
        !Number.isInteger(Number(maxParticipants)) ||
        Number(maxParticipants) < 2 ||
        Number(maxParticipants) > 10
    ) {
        return res.status(400).json({
            message: "인원은 2~10명이어야 합니다."
        });
    }

    const finalStatus = allowedStatuses.includes(status)
        ? status
        : "모집 중";

    const newPost = {
        id: data.nextId++,
        creatorId: req.user.id,
        creatorNickname: req.user.nickname,
        participantIds: [req.user.id],
        category,
        title,
        location,
        deadlineTime,
        orderTime,
        maxParticipants: Number(maxParticipants),
        settlementType: settlementType || null,
        approvalType: approvalType || null,
        minAmount: minAmount ?? null,
        maxAmount: maxAmount ?? null,
        status: finalStatus,
        createdAt: new Date().toISOString()
    };

    data.posts.push(newPost);
    saveData();

    res.status(201).json(newPost);
});

// 모집글 상세 조회
app.get("/api/posts/:id", (req, res) => {
    const post = data.posts.find(
        p => String(p.id) === req.params.id
    );

    if (!post) {
        return res.status(404).json({
            message: "모집글을 찾을 수 없습니다."
        });
    }

    res.json(post);
});

// 주문 참여 신청
app.post("/api/posts/:id/join", requireAuth, (req, res) => {
    const post = data.posts.find(
        p => String(p.id) === req.params.id
    );

    if (!post) {
        return res.status(404).json({
            message: "모집글을 찾을 수 없습니다."
        });
    }

    if (post.creatorId === req.user.id) {
        return res.status(400).json({
            message: "본인이 모집한 주문입니다."
        });
    }

    if (post.status !== "모집 중") {
        return res.status(400).json({
            message: "모집이 마감되었습니다."
        });
    }

    post.participantIds = post.participantIds || [];
    post.participants = post.participants || [];

    if (post.participantIds.includes(req.user.id)) {
        return res.status(409).json({
            message: "이미 참여 신청한 주문입니다."
        });
    }

    if (post.participantIds.length >= post.maxParticipants) {
        return res.status(400).json({
            message: "모집 인원이 가득 찼습니다."
        });
    }

    const instantJoin = ["instant", "즉시 참여"].includes(
        post.approvalType
    );

    post.participantIds.push(req.user.id);

    post.participants.push({
        id: req.user.id,
        nickname: req.user.nickname,
        status: instantJoin ? "approved" : "pending"
    });

    saveData();

    res.json({
        success: true,
        message: instantJoin
            ? "참여가 확정되었습니다."
            : "참여 신청이 완료되었습니다.",
        post
    });
});

// 주문 참여 취소
app.delete("/api/posts/:id/join", requireAuth, (req, res) => {
    const post = data.posts.find(
        p => String(p.id) === req.params.id
    );

    if (!post) {
        return res.status(404).json({
            message: "모집글을 찾을 수 없습니다."
        });
    }

    if (post.creatorId === req.user.id) {
        return res.status(400).json({
            message: "모집자는 참여를 취소할 수 없습니다."
        });
    }

    if (post.status !== "모집 중") {
        return res.status(400).json({
            message: "모집이 마감된 주문은 취소할 수 없습니다."
        });
    }

    post.participantIds = (post.participantIds || []).filter(
        id => id !== req.user.id
    );

    post.participants = (post.participants || []).filter(
        p => p.id !== req.user.id
    );

    saveData();

    res.json({
        success: true,
        message: "참여가 취소되었습니다.",
        post
    });
});

// 모집자의 참여 신청 승인
app.patch(
    "/api/posts/:id/participants/:userId",
    requireAuth,
    (req, res) => {

        const post = data.posts.find(
            p => String(p.id) === req.params.id
        );

        if (!post) {
            return res.status(404).json({
                message: "모집글을 찾을 수 없습니다."
            });
        }

        if (post.creatorId !== req.user.id) {
            return res.status(403).json({
                message: "모집자만 승인할 수 있습니다."
            });
        }

        if (post.status === "완료") {
            return res.status(400).json({
                message: "이미 완료된 주문입니다."
            });
        }

        const participant = (post.participants || []).find(
            p => p.id === req.params.userId
        );

        if (!participant) {
            return res.status(404).json({
                message: "참여자를 찾을 수 없습니다."
            });
        }

        participant.status = "approved";

        saveData();

        res.json({
            success: true,
            message: "참여 신청을 승인했습니다.",
            post
        });
    }
);

// 서버 실행
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
