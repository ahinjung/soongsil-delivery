
// 마이페이지 기능 구현

document.addEventListener("DOMContentLoaded", async function () {

    // 1. 서버에서 로그인한 회원 정보 조회
    let currentUser = await Auth.getCurrentUser();

    if (!currentUser) {
        alert("로그인이 필요합니다.");
        window.location.href = "login.html";
        return;
    }

    // HTML 요소 가져오기
    const nicknameElement = document.getElementById("userNickname");
    const emailElement = document.getElementById("userEmail");
    const profileImage = document.getElementById("profileImage");

    const profileModal = document.getElementById("profileModal");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const profileForm = document.getElementById("profileForm");

    const editNickname = document.getElementById("editNickname");
    const editProfileImage = document.getElementById("editProfileImage");

    const createdTab = document.getElementById("createdTab");
    const joinedTab = document.getElementById("joinedTab");
    const orderList = document.getElementById("orderList");

    const createdCount = document.getElementById("createdCount");
    const joinedCount = document.getElementById("joinedCount");

    let createdOrders = [];
    let joinedOrders = [];
    let currentTab = "created";

    // 기본 프로필 이미지
    const defaultProfile =
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
            '<circle cx="50" cy="50" r="50" fill="#eaf2fa"/>' +
            '<circle cx="50" cy="37" r="18" fill="#8ab6dc"/>' +
            '<path d="M17 91 Q17 57 50 57 Q83 57 83 91" fill="#8ab6dc"/>' +
            '</svg>'
        );

    // 2. 회원 정보 화면에 표시
    function displayProfile() {
        nicknameElement.textContent = currentUser.nickname;
        emailElement.textContent = currentUser.email;

        profileImage.src =
            currentUser.profileImage || defaultProfile;
    }

    displayProfile();

    // 3. 프로필 수정 팝업 열기
    editProfileBtn.addEventListener("click", function () {
        editNickname.value = currentUser.nickname;
        editProfileImage.value = "";
        profileModal.hidden = false;
    });

    cancelEditBtn.addEventListener("click", function () {
        profileModal.hidden = true;
    });

    profileModal.addEventListener("click", function (event) {
        if (event.target === profileModal) {
            profileModal.hidden = true;
        }
    });

    // 이미지 파일 읽기
    function readImage(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();

            reader.onload = function () {
                resolve(reader.result);
            };

            reader.onerror = function () {
                reject(new Error("이미지를 읽을 수 없습니다."));
            };

            reader.readAsDataURL(file);
        });
    }

    // 4. 프로필 수정 및 서버 저장
    profileForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const newNickname = editNickname.value.trim();
        const imageFile = editProfileImage.files[0];

        if (newNickname.length < 2 || newNickname.length > 8) {
            alert("닉네임은 2~8자로 입력해주세요.");
            return;
        }

        if (imageFile) {
            if (!["image/jpeg", "image/png"].includes(imageFile.type)) {
                alert("JPG 또는 PNG 파일만 가능합니다.");
                return;
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                alert("이미지는 5MB 이하만 가능합니다.");
                return;
            }
        }

        const submitBtn = profileForm.querySelector('[type="submit"]');
        submitBtn.disabled = true;

        try {
            let imageData;

            if (imageFile) {
                imageData = await readImage(imageFile);
            }

            const result = await Auth.updateProfile(
                newNickname,
                imageData
            );

            currentUser = result.user;

            displayProfile();
            profileModal.hidden = true;

            alert("프로필이 수정되었습니다.");

        } catch (error) {
            alert(error.message);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 주문 목록 메시지 표시
    function showOrderMessage(message) {
        orderList.innerHTML = "";

        const element = document.createElement("p");
        element.className = "empty-message";
        element.textContent = message;

        orderList.appendChild(element);
    }

    // 5. 서버에서 주문 데이터 조회
    async function loadOrders() {
        showOrderMessage("주문 내역을 불러오는 중입니다.");

        try {
            createdOrders = await Auth.getCreatedOrders();
            joinedOrders = await Auth.getJoinedOrders();

            updateOrderCounts();
            displayOrders(currentTab);

        } catch (error) {
            showOrderMessage("주문 내역을 불러오지 못했습니다.");
            console.error(error);
        }
    }

    // 주문 건수 표시
    function updateOrderCounts() {
        createdCount.textContent = createdOrders.length + "건";
        joinedCount.textContent = joinedOrders.length + "건";
    }

    // 6. 주문 목록 출력
    function displayOrders(type) {

        const orders = type === "created"
            ? createdOrders
            : joinedOrders;

        orderList.innerHTML = "";

        if (orders.length === 0) {
            showOrderMessage("주문 내역이 없습니다.");
            return;
        }

        orders.forEach(function (order) {

            const card = document.createElement("div");
            card.className = "order-card";

            // 주문 제목
            const title = document.createElement("h4");
            title.textContent = order.title || "제목 없음";

            // 주문 날짜
            const date = document.createElement("p");

            date.textContent = "작성 날짜: " +
                (order.createdAt
                    ? new Date(order.createdAt)
                        .toLocaleDateString("ko-KR")
                    : "미정");

            // 수령 장소
            const location = document.createElement("p");
            location.textContent = "수령 장소: " +
                (order.location || "미정");

            // 참여 인원
            const count = document.createElement("p");

            const participantCount =
                Array.isArray(order.participantIds)
                    ? order.participantIds.length
                    : 0;

            count.textContent = "참여 인원: " +
                participantCount + "/" +
                (order.maxParticipants || "-") + "명";

            // 주문 상태
            const status = document.createElement("p");

            status.textContent = "진행 상태: " +
                (order.status || "미정");

            // 상태별 색상
            if (order.status === "모집 중") {
                status.style.color = "#3498db";
            } else if (order.status === "완료") {
                status.style.color = "#27ae60";
            } else if (order.status === "마감") {
                status.style.color = "#e67e22";
            }

            status.style.fontWeight = "bold";

            // 카드에 정보 추가
            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(location);
            card.appendChild(count);
            card.appendChild(status);

            orderList.appendChild(card);
        });
    }

    // 모집한 주문 탭
    createdTab.addEventListener("click", function () {
        currentTab = "created";

        createdTab.classList.add("active");
        joinedTab.classList.remove("active");

        loadOrders();
    });

    // 참여한 주문 탭
    joinedTab.addEventListener("click", function () {
        currentTab = "joined";

        joinedTab.classList.add("active");
        createdTab.classList.remove("active");

        loadOrders();
    });

    // 처음 접속했을 때 주문 목록 조회
    loadOrders();

    // 7. 로그아웃
    async function logout() {
        try {
            await Auth.logout();
        } catch (error) {
            console.error(error);
        }
    }

    document.getElementById("logoutBtn")
        .addEventListener("click", logout);

    const headerLogoutBtn =
        document.getElementById("headerLogoutBtn");

    if (headerLogoutBtn) {
        headerLogoutBtn.addEventListener("click", logout);
    }

    // 8. 회원 탈퇴
    document.getElementById("deleteAccountBtn")
        .addEventListener("click", async function () {

            const confirmed = confirm(
                "정말 회원 탈퇴하시겠습니까?\n" +
                "탈퇴 후 회원 정보는 복구할 수 없습니다."
            );

            if (!confirmed) {
                return;
            }

            try {
                const result = await Auth.deleteAccount();

                alert(result.message);

                window.location.href = "login.html";

            } catch (error) {
                alert(error.message);
            }
        });
});
