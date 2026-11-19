document.addEventListener("DOMContentLoaded", function () {
    const currentUser = Auth.getCurrentUser();

    if (!currentUser) {
        alert("로그인이 필요한 서비스입니다.");
        window.location.href = "login.html";
        return;
    }
    
    const form = document.getElementById("createPostForm");
    const minAmountInput = document.getElementById("minAmount");
    const maxAmountInput = document.getElementById("maxAmount");
    const cancelBtn = document.getElementById("cancelBtn");

    const allowedBuildings = [
        "정보과학관", "형남공학관", "조만식기념관", "베어드홀",
        "미래관", "진리관", "숭덕경상관", "문화관",
        "안익태기념관", "중앙도서관", "학생회관", "신양관", "레지던스홀(기숙사)"
    ];

    function formatNumber(inputEl) {
        inputEl.addEventListener("input", function (e) {
            let value = e.target.value;
            let numbersOnly = "";
            
            for (let i = 0; i < value.length; i++) {
                let char = value[i];
                if (char >= "0" && char <= "9") {
                    numbersOnly += char;
                }
            }

            if (numbersOnly === "") {
                e.target.value = "";
            } else {
                let numberValue = Number(numbersOnly);
                e.target.value = numberValue.toLocaleString("ko-KR");
            }
        });
    }

    formatNumber(minAmountInput);
    formatNumber(maxAmountInput);

    function showError(inputId, errorId, message) {
        const inputEl = document.getElementById(inputId);
        const errorEl = document.getElementById(errorId);
        
        if (inputEl) {
            inputEl.classList.add("input-error");
        }
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    function clearAllErrors() {
        const errorInputs = document.querySelectorAll(".input-error");
        for (let i = 0; i < errorInputs.length; i++) {
            errorInputs[i].classList.remove("input-error");
        }

        const errorMsgs = document.querySelectorAll(".error-msg");
        for (let i = 0; i < errorMsgs.length; i++) {
            errorMsgs[i].textContent = "";
        }
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearAllErrors();

        let isFormValid = true;

        const category = document.getElementById("category").value;
        const title = document.getElementById("title").value.trim();
        const location = document.getElementById("location").value;
        const deadlineTime = document.getElementById("deadlineTime").value;
        const orderTime = document.getElementById("orderTime").value;
        const maxParticipants = Number(document.getElementById("maxParticipants").value);

        let minAmount = null;
        if (minAmountInput.value !== "") {
            minAmount = Number(minAmountInput.value.replace(/,/g, ""));
        }

        let maxAmount = null;
        if (maxAmountInput.value !== "") {
            maxAmount = Number(maxAmountInput.value.replace(/,/g, ""));
        }

        if (category === "") {
            showError("category", "categoryError", "카테고리를 선택해 주세요.");
            isFormValid = false;
        }

        if (title === "") {
            showError("title", "titleError", "제목을 입력해 주세요.");
            isFormValid = false;
        }

        let isBuildingAllowed = false;
        for (let i = 0; i < allowedBuildings.length; i++) {
            if (allowedBuildings[i] === location) {
                isBuildingAllowed = true;
                break;
            }
        }

        if (location === "" || !isBuildingAllowed) {
            showError("location", "locationError", "숭실대 건물 목록에서 장소를 골라주세요.");
            isFormValid = false;
        }

        if (deadlineTime === "") {
            showError("deadlineTime", "deadlineTimeError", "모집 끝나는 시간을 골라주세요.");
            isFormValid = false;
        }

        if (orderTime === "") {
            showError("orderTime", "orderTimeError", "주문할 시간을 골라주세요.");
            isFormValid = false;
        } else if (deadlineTime !== "" && deadlineTime >= orderTime) {
            showError("deadlineTime", "deadlineTimeError", "마감 시간은 주문 시간보다 빨라야 해요.");
            isFormValid = false;
        }

        if (maxParticipants < 2 || maxParticipants > 10) {
            showError("maxParticipants", "participantsError", "인원은 2명에서 10명 사이로 입력해 주세요.");
            isFormValid = false;
        }

        if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
            showError("maxAmount", "amountError", "최대 금액은 최소 금액보다 커야 해요.");
            isFormValid = false;
        }

        if (isFormValid === false) {
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    category,
                    title,
                    location,
                    deadlineTime,
                    orderTime,
                    maxParticipants,
                    minAmount,
                    maxAmount,
                    status: "모집 중",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "모집글 등록에 실패했어요.");
                return;
            }

            alert("모집글이 정상적으로 작성되었습니다!");
            window.location.href = "index.html";
        } catch (error) {
            console.error("서버 통신 오류:", error);
            alert("서버에 연결할 수 없어요. 백엔드 서버가 실행 중인지 확인해 주세요.");
        }
    });

    cancelBtn.addEventListener("click", function () {
        let userConfirmed = confirm("정말 작성을 취소하고 돌아가시겠어요?");
        if (userConfirmed === true) {
            window.location.href = "index.html";
        }
    });
});
