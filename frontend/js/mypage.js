
// 마이페이지 기능 구현

document.addEventListener("DOMContentLoaded", function () {

    // 1. 로그인 여부 확인
    let currentUser = Auth.getCurrentUser();

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

    // 기본 프로필 이미지 (별도 이미지 파일 없어도 표시)
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

        profileImage.src = currentUser.profileImage &&
            currentUser.profileImage !== "images/default-profile.png"
            ? currentUser.profileImage
            : defaultProfile;
    }

    displayProfile();

    // 3. 프로필 수정 팝업 열기
    editProfileBtn.addEventListener("click", function () {
        editNickname.value = currentUser.nickname;
        editProfileImage.value = "";
        profileModal.hidden = false;
    });

    // 팝업 닫기
    cancelEditBtn.addEventListener("click", function () {
        profileModal.hidden = true;
    });

    // 팝업 바깥 클릭 시 닫기
    profileModal.addEventListener("click", function (event) {
        if (event.target === profileModal) {
            profileModal.hidden = true;
        }
    });

    // 4. 프로필 저장
    profileForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const newNickname = editNickname.value.trim();
        const imageFile = editProfileImage.files[0];

        if (newNickname.length < 2 || newNickname.length > 8) {
            alert("닉네임은 2~8자로 입력해주세요.");
            return;
        }

        // 이미지 저장 함수
        function saveProfile(imageData) {
            const users = Auth.getUsers();

            const userIndex = users.findIndex(
                user => user.id === currentUser.id
            );

            if (userIndex === -1) {
                alert("회원 정보를 찾을 수 없습니다.");
                return;
            }

            users[userIndex].nickname = newNickname;

            if (imageData) {
                users[userIndex].profileImage = imageData;
            }

            try {
                localStorage.setItem("users", JSON.stringify(users));
            } catch (error) {
                alert("저장 공간이 부족합니다. 더 작은 이미지를 사용해주세요.");
                return;
            }

            currentUser = Auth.getCurrentUser();
            displayProfile();

            profileModal.hidden = true;
            alert("프로필이 수정되었습니다.");
        }

        if (imageFile) {
            // 파일 형식 검사
            if (!["image/jpeg", "image/png"].includes(imageFile.type)) {
                alert("JPG 또는 PNG 파일만 업로드할 수 있습니다.");
                return;
            }

            // 5MB로 크기 제한
            if (imageFile.size > 5 * 1024 * 1024) {
                alert("이미지는 5MB 이하만 선택할 수 있습니다.");
                return;
            }

            const reader = new FileReader();

            reader.onload = function () {
                saveProfile(reader.result);
            };

            reader.onerror = function () {
                alert("이미지를 읽는 중 오류가 발생했습니다.");
            };

            reader.readAsDataURL(imageFile);

        } else {
            saveProfile(null);
        }
    });

    // 5. 주문 데이터 불러오기
    function getOrders() {
        return JSON.parse(localStorage.getItem("orders") || "[]");
    }

    function getCreatedOrders() {
        return getOrders().filter(
            order => String(order.creatorId) === String(currentUser.id)
        );
    }

    function getJoinedOrders() {
        return getOrders().filter(
            order => Array.isArray(order.participantIds) &&
            order.participantIds.some(
                id => String(id) === String(currentUser.id)
            ) &&
            String(order.creatorId) !== String(currentUser.id)
        );
    }

    // 주문 건수 표시
    function updateOrderCounts() {
        createdCount.textContent = getCreatedOrders().length + "건";
        joinedCount.textContent = getJoinedOrders().length + "건";
    }

    // 6. 주문 목록 출력
    function displayOrders(type) {
        const orders = type === "created"
            ? getCreatedOrders()
            : getJoinedOrders();

        orderList.innerHTML = "";

        if (orders.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-message";
            emptyMessage.textContent = "주문 내역이 없습니다.";
            orderList.appendChild(emptyMessage);
            return;
        }

        orders.forEach(function (order) {
            const card = document.createElement("div");
            card.className = "order-card";

            const title = document.createElement("h4");
            title.textContent = order.title || "제목 없음";

            const location = document.createElement("p");
            location.textContent = "수령 장소: " +
                (order.location || "미정");

            const count = document.createElement("p");
            const participantCount = Array.isArray(order.participantIds)
                ? order.participantIds.length
                : 0;

            count.textContent = "참여 인원: " +
                participantCount + "/" +
                (order.maxParticipants || "-") + "명";

            const status = document.createElement("p");

            const statusNames = {
                recruiting: "모집 중",
                ongoing: "진행 중",
                completed: "완료",
                cancelled: "취소"
            };

            status.textContent = "진행 상태: " +
                (statusNames[order.status] || order.status || "미정");

            card.appendChild(title);
            card.appendChild(location);
            card.appendChild(count);
            card.appendChild(status);

            orderList.appendChild(card);
        });
    }

    // 주문 탭 전환
    createdTab.addEventListener("click", function () {
        createdTab.classList.add("active");
        joinedTab.classList.remove("active");
        displayOrders("created");
    });

    joinedTab.addEventListener("click", function () {
        joinedTab.classList.add("active");
        createdTab.classList.remove("active");
        displayOrders("joined");
    });

    updateOrderCounts();
    displayOrders("created");

    // 7. 로그아웃
    function logout() {
        Auth.logout();
    }

    document.getElementById("logoutBtn")
        .addEventListener("click", logout);

    document.getElementById("headerLogoutBtn")
        .addEventListener("click", logout);

    // 8. 회원 탈퇴
    document.getElementById("deleteAccountBtn")
        .addEventListener("click", function () {

            const confirmed = confirm(
                "정말 회원 탈퇴하시겠습니까?\n탈퇴 후 회원 정보는 복구할 수 없습니다."
            );

            if (!confirmed) {
                return;
            }

            const users = Auth.getUsers();

            const remainingUsers = users.filter(
                user => user.id !== currentUser.id
            );

            localStorage.setItem(
                "users",
                JSON.stringify(remainingUsers)
            );

            sessionStorage.removeItem("currentUserId");

            alert("회원 탈퇴가 완료되었습니다.");
            window.location.href = "login.html";
        });

});
