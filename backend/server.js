const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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

let posts = [];
let nextId = 1;

// 모집글 목록 조회
app.get("/api/posts", (req, res) => {
  res.json(posts);
});

// 모집글 하나 조회
app.get("/api/posts/:id", (req, res) => {
  const post = posts.find((item) => String(item.id) === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "모집글을 찾을 수 없어요." });
  }
  res.json(post);
});

// 모집글 등록 (기본 상태: '모집 중')
app.post("/api/posts", (req, res) => {
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
    storeUrl,
    organizer,
    status
  } = req.body;

  if (!category || !title || !location || !deadlineTime || !orderTime || !maxParticipants) {
    return res.status(400).json({ message: "필수 항목을 모두 입력해 주세요." });
  }

  if (!allowedBuildings.includes(location)) {
    return res.status(400).json({ message: "숭실대 건물 목록에서 장소를 골라주세요." });
  }

  const finalStatus = allowedStatuses.includes(status) ? status : "모집 중";

  const newPost = {
    id: nextId++,
    category,
    title,
    location,
    deadlineTime,
    orderTime,
    maxParticipants: Number(maxParticipants),
    settlementType: settlementType || "1/N",
    approvalType: approvalType || "manual",
    minAmount: minAmount ?? null,
    maxAmount: maxAmount ?? null,
    storeUrl: storeUrl || null,
    organizer:
      organizer && organizer.id
        ? { id: String(organizer.id), nickname: String(organizer.nickname || "모집자") }
        : null,
    status: finalStatus,
    createdAt: new Date().toISOString()
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});