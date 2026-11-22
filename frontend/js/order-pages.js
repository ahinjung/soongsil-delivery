(() => {
    'use strict';

    const STATE_KEY = 'team22_order_features_v1';

    const page = document.body.dataset.page;
    const postId = new URLSearchParams(window.location.search).get('id');
    const formatMoney = amount => `${Number(amount).toLocaleString('ko-KR')}원`;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function pageLink(filename, id) {
        return `${filename}.html?id=${encodeURIComponent(String(id))}`;
    }

    function dateLabel(value) {
        if (!value) return '미정';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('ko-KR', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function getJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn(`${key} 데이터를 읽을 수 없습니다.`, error);
            return fallback;
        }
    }

    function putJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('저장 실패:', error);
            showToast('브라우저에 데이터를 저장하지 못했습니다.');
            return false;
        }
    }

    function showToast(message) {
        const node = document.getElementById('toast');
        if (!node) return;
        node.textContent = message;
        node.hidden = false;
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => { node.hidden = true; }, 2700);
    }

    function normalizeUser(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = raw.id ?? raw.userId ?? raw.email;
        if (id === undefined || id === null || String(id).trim() === '') return null;
        return {
            id: String(id),
            nickname: String(raw.nickname || raw.name || raw.username || raw.email || '사용자')
        };
    }

    let currentUser = null;

    function getCurrentUser() {
        return currentUser;
    }

    async function getPost(id) {
        const post = await Auth.request('/posts/' + encodeURIComponent(id));
        return post ? normalizePost(post) : null;
    }

    async function changeMembership(post, endpoint, method) {
        try {
            const result = await Auth.request(
                '/posts/' + encodeURIComponent(post.id) + endpoint, method
            );
            renderDetail(normalizePost(result.post));
            showToast(result.message);
        } catch (error) {
            showToast(error.message);
        }
    }

    function normalizePost(raw) {
        const organizerRaw = raw.organizer || raw.author || raw.creator || {};
        const organizerId = organizerRaw.id ?? organizerRaw.userId ?? raw.creatorId ?? raw.organizerId ?? raw.authorId ?? raw.userId;
        const organizer = {
            id: organizerId != null ? String(organizerId) : '',
            nickname: String(organizerRaw.nickname || organizerRaw.name || raw.creatorNickname || raw.authorNickname || raw.nickname || '모집자')
        };
        const max = Number(raw.maxMembers ?? raw.maxParticipants ?? raw.capacity ?? raw.targetCount ?? 0);
        const participants = Array.isArray(raw.participants) ? raw.participants : [];
        const itemTotal = Number(raw.itemTotal ?? raw.productPrice);
        const shipping = Number(raw.deliveryFee ?? raw.shippingFee ?? 0);
        const explicitTotal = raw.totalAmount ?? raw.totalPrice ?? raw.totalCost;
        let total = explicitTotal != null && explicitTotal !== '' ? Number(explicitTotal) : null;
        if (total === null && (raw.itemTotal != null || raw.productPrice != null)) {
            total = itemTotal + shipping;
        }
        if (!Number.isFinite(total) || total < 0) total = null;

        return {
            id: String(raw.id ?? raw.postId ?? raw._id ?? ''),
            title: String(raw.title ?? '제목 없음'),
            description: String(raw.description ?? raw.content ?? ''),
            category: String(raw.category ?? ''),
            type: String(raw.type ?? raw.orderType ?? '공동 주문'),
            organizer,
            participants,
            maxMembers: Number.isFinite(max) && max > 0 ? max : null,
            pickupPlace: String(raw.location ?? raw.pickupPlace ?? raw.pickupLocation ?? raw.building ?? '미정'),
            orderAt: raw.orderAt ?? raw.orderTime ?? null,
            deadline: raw.deadlineTime ?? raw.deadline ?? raw.deadlineAt ?? raw.closeAt ?? null,
            pickupAt: raw.pickupAt ?? raw.pickupTime ?? null,
            settlementMethod: String(raw.settlementType ?? raw.settlementMethod ?? raw.paymentMethod ?? '1/N'),
            joinMethod: ['instant', '즉시 참여'].includes(raw.approvalType ?? raw.joinMethod) ? 'instant' : 'approval',
            status: String(raw.status ?? 'open'),
            totalAmount: total,
            personalAmounts: raw.personalAmounts && typeof raw.personalAmounts === 'object' ? raw.personalAmounts : {}
        };
    }

    function loadFeatureStore() {
        const data = getJson(STATE_KEY, {});
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    }

    function getFeatures(id) {
        const store = loadFeatureStore();
        return {
            overrides: {},
            messages: [],
            settlement: { requested: false, paidIds: [], totalAmount: null },
            ...(store[id] || {})
        };
    }

    function updateFeatures(id, updater) {
        const store = loadFeatureStore();
        const next = getFeatures(id);
        updater(next);
        store[id] = next;
        return putJson(STATE_KEY, store);
    }

    function participantsFor(post, features) {
        const people = new Map();
        if (post.organizer.id) {
            people.set(post.organizer.id, {
                id: post.organizer.id,
                nickname: post.organizer.nickname,
                status: 'approved',
                isHost: true
            });
        }
        post.participants.forEach(raw => {
            if (!raw || typeof raw !== 'object') return;
            const id = raw.id ?? raw.userId ?? raw.email;
            if (id == null || String(id) === '') return;
            const key = String(id);
            people.set(key, {
                id: key,
                nickname: String(raw.nickname || raw.name || raw.username || key),
                status: ['approved', 'accepted', 'confirmed', '참여 확정'].includes(raw.status) ? 'approved' : 'pending',
                isHost: key === post.organizer.id
            });
        });
        return [...people.values()];
    }

    function isHost(post, user) {
        return Boolean(user && post.organizer.id && post.organizer.id === user.id);
    }

    function myMembership(members, user) {
        return user ? members.find(member => member.id === user.id) : null;
    }

    function isClosed(post, members) {
        const status = post.status.toLowerCase();
        if (['closed', '마감', '모집 마감', 'completed', 'cancelled', '완료', '취소'].includes(status)) return true;
        const deadline = post.deadline && new Date(post.deadline).getTime();
        if (Number.isFinite(deadline) && Date.now() > deadline) return true;
        return Boolean(post.maxMembers && members.filter(member => member.status !== 'cancelled').length >= post.maxMembers);
    }

    function emptyView(root, title, description) {
        root.innerHTML = `
            <section class="order-empty">
                <div class="order-empty-icon" aria-hidden="true">▢</div>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(description)}</p>
                <a class="order-button order-button-primary" href="index.html">모집글 목록으로</a>
            </section>
        `;
    }

    function memberListMarkup(members, owner, canApprove) {
        if (!members.length) return '<p class="order-subtitle">아직 참여자가 없습니다.</p>';
        return `<ul class="order-members">${members.map(person => `
            <li class="order-member">
                <span class="order-member-label">${escapeHtml(person.nickname)}${person.isHost ? ' (모집자)' : ''}</span>
                <span class="order-member-status">${person.status === 'approved' ? '참여 확정' : '승인 대기'}</span>
                ${canApprove && person.status === 'pending'
                    ? `<button type="button" class="order-mini-action" data-approve="${escapeHtml(person.id)}">승인</button>` : ''}
            </li>
        `).join('')}</ul>`;
    }

    function renderDetail(post) {
        const root = document.getElementById('detailRoot');
        const user = getCurrentUser();
        const features = getFeatures(post.id);
        const members = participantsFor(post, features);
        const me = myMembership(members, user);
        const host = isHost(post, user);
        const closed = isClosed(post, members);
        const confirmed = members.filter(person => person.status === 'approved').length;
        const enrolled = members.length;
        const status = ['완료', 'completed'].includes(post.status) ? '완료' : closed ? '모집 마감' : '모집 중';
        const memberLimit = post.maxMembers ? `${enrolled} / ${post.maxMembers}명` : `${enrolled}명`;

        let action = '';
        if (!user) {
            action = '<a href="login.html" class="order-button order-button-primary">로그인 후 참여</a>';
        } else if (host) {
            action = '<button class="order-button order-button-primary" type="button" disabled>내가 모집한 주문</button>';
        } else if (me?.status === 'pending') {
            action = '<button class="order-button order-button-primary" type="button" id="cancelJoin">참여 신청 취소</button>';
        } else if (me?.status === 'approved') {
            action = '<button class="order-button order-button-primary" type="button" id="cancelJoin">참여 취소</button>';
        } else if (closed) {
            action = '<button class="order-button order-button-primary" type="button" disabled>모집 마감</button>';
        } else {
            action = '<button class="order-button order-button-primary" type="button" id="requestJoin">참여 신청</button>';
        }

        root.innerHTML = `
            <article class="order-post-detail">
                <span class="order-pill ${closed ? 'closed' : ''}">${status}</span>
                <h1 class="order-title">${escapeHtml(post.title)}</h1>
                <p class="order-subtitle">${escapeHtml(post.category || post.type)} · ${escapeHtml(post.organizer.nickname)}</p>
                ${post.description ? `<p class="order-description">${escapeHtml(post.description)}</p>` : ''}

                <section class="order-info-card" aria-label="모집글 정보">
                    <dl class="order-info-grid">
                        <div class="order-info-field"><dt>모집자</dt><dd>${escapeHtml(post.organizer.nickname)}</dd></div>
                        <div class="order-info-field"><dt>수령 장소</dt><dd>${escapeHtml(post.pickupPlace)}</dd></div>
                        <div class="order-info-field"><dt>참여 인원</dt><dd>${memberLimit}</dd></div>
                        <div class="order-info-field"><dt>정산 방식</dt><dd>${escapeHtml(post.settlementMethod)}</dd></div>
                        <div class="order-info-field"><dt>주문 / 마감</dt><dd>${escapeHtml(dateLabel(post.orderAt))} / ${escapeHtml(dateLabel(post.deadline))}</dd></div>
                        <div class="order-info-field"><dt>참여 방식</dt><dd>${post.joinMethod === 'instant' ? '즉시 참여' : '모집자 승인제'}</dd></div>
                    </dl>
                </section>

                <div class="order-button-row">
                    ${action}
                    <a class="order-button order-button-outline" ${me?.status === 'approved' || host ? '' : 'aria-disabled="true" tabindex="-1"'}
                       href="${me?.status === 'approved' || host ? pageLink('chat', post.id) : '#'}"
                       id="enterChat">채팅방 입장</a>
                </div>
                <p class="order-hint">${me?.status === 'pending' ? '승인 대기 중 · 모집자 승인 후 채팅방에 입장할 수 있어요.' : '참여 신청 → 승인 대기 → 참여 확정'}</p>

                <section class="order-section">
                    <div class="order-section-heading"><h2>참여자 현황</h2><span>${confirmed}명 확정</span></div>
                    ${memberListMarkup(members, user, host)}
                </section>
            </article>
        `;

        document.getElementById('requestJoin')?.addEventListener('click', async event => {
            if (closed) return showToast('모집이 마감되었습니다.');
            event.currentTarget.disabled = true;
            try {
                await changeMembership(post, '/join', 'POST');
            } finally {
                const button = document.getElementById('requestJoin');
                if (button) button.disabled = false;
            }
        });

        document.getElementById('cancelJoin')?.addEventListener('click', async event => {
            if (getFeatures(post.id).settlement?.requested) {
                return showToast('정산이 시작되어 참여를 취소할 수 없습니다.');
            }
            event.currentTarget.disabled = true;
            try {
                await changeMembership(post, '/join', 'DELETE');
            } finally {
                const button = document.getElementById('cancelJoin');
                if (button) button.disabled = false;
            }
        });

        document.querySelectorAll('[data-approve]').forEach(button => {
            button.addEventListener('click', async () => {
                if (!host) return;
                button.disabled = true;
                try {
                    await changeMembership(post, '/participants/' +
                        encodeURIComponent(button.dataset.approve), 'PATCH');
                } finally {
                    button.disabled = false;
                }
            });
        });

        const chatLink = document.getElementById('enterChat');
        if (chatLink?.getAttribute('aria-disabled') === 'true') {
            chatLink.addEventListener('click', event => {
                event.preventDefault();
                showToast('참여가 확정된 사용자만 입장할 수 있습니다.');
            });
        }
    }

    function canEnter(post, user, features) {
        const members = participantsFor(post, features);
        return isHost(post, user) || myMembership(members, user)?.status === 'approved';
    }

    function renderChatMessages(messages, currentUser) {
        const list = document.getElementById('messageList');
        if (!list) return;
        if (!messages.length) {
            list.innerHTML = '<p class="order-chat-empty">아직 대화가 없습니다.<br>첫 메시지를 작성해 보세요.</p>';
            return;
        }
        list.innerHTML = messages.map(msg => {
            const own = String(msg.authorId) === currentUser.id;
            return `
                <div class="order-message ${own ? 'self' : ''}">
                    ${own ? '' : `<span class="order-message-name">${escapeHtml(msg.author)}</span>`}
                    <div class="order-bubble">${escapeHtml(msg.text)}</div>
                    <span class="order-message-time">${escapeHtml(dateLabel(msg.sentAt))}</span>
                </div>
            `;
        }).join('');
        list.scrollTop = list.scrollHeight;
    }

    function renderChat(post) {
        const root = document.getElementById('chatRoot');
        const user = getCurrentUser();
        const features = getFeatures(post.id);
        document.getElementById('backToDetail').href = pageLink('post_detail', post.id);

        if (!user || !canEnter(post, user, features)) {
            emptyView(root, '채팅방에 입장할 수 없습니다', '참여 신청 후 승인이 완료되면 채팅을 이용할 수 있습니다.');
            return;
        }

        const members = participantsFor(post, features).filter(person => person.status === 'approved');
        const messages = Array.isArray(features.messages) ? features.messages : [];
        const settlement = features.settlement || {};
        const amount = settlement.totalAmount ?? post.totalAmount;
        const personal = amount == null ? '금액 미정' : formatMoney(Math.floor(amount / Math.max(members.length, 1)));

        root.innerHTML = `
            <div class="order-chat-layout">
                <section class="order-chat-panel">
                    <h1 class="order-chat-title">${escapeHtml(post.title)}</h1>
                    <p class="order-chat-summary">참여자 ${members.length}명 · ${escapeHtml(post.pickupPlace)}</p>
                    <div id="messageList" class="order-chat-messages" role="log" aria-live="polite"></div>
                    <form id="chatForm" class="order-compose">
                        <textarea id="chatInput" rows="2" maxlength="500" placeholder="메시지를 입력하세요..." aria-label="채팅 메시지" required></textarea>
                        <button type="submit" class="order-button order-button-primary">전송</button>
                    </form>
                </section>

                <aside class="order-chat-side">
                    <section class="order-side-card">
                        <h2>공동 정산 안내</h2>
                        <p>내 예상 정산 금액 <strong>${personal}</strong></p>
                        <p>정산 상태 <strong>${settlement.requested ? '정산 진행 중' : '정산 대기'}</strong></p>
                        <a class="order-button order-button-primary order-button-full" href="${pageLink('settlement', post.id)}">정산 확인하기</a>
                    </section>
                    <section class="order-side-card">
                        <h2>주문 · 수령 안내</h2>
                        <p>수령 장소 <strong>${escapeHtml(post.pickupPlace)}</strong></p>
                        <p>수령 예정 <strong>${escapeHtml(dateLabel(post.pickupAt))}</strong></p>
                        <hr class="order-separator">
                        <p>현재 채팅 내용은 이 브라우저에 저장됩니다. 다른 기기와 실시간으로 공유되지는 않습니다.</p>
                    </section>
                </aside>
            </div>
        `;

        renderChatMessages(messages, user);
        document.getElementById('chatForm').addEventListener('submit', event => {
            event.preventDefault();
            const input = document.getElementById('chatInput');
            const content = input.value.trim();
            if (!content) return;
            updateFeatures(post.id, data => {
                if (!Array.isArray(data.messages)) data.messages = [];
                data.messages.push({
                    authorId: user.id,
                    author: user.nickname,
                    text: content,
                    sentAt: new Date().toISOString()
                });
            });
            input.value = '';
            renderChatMessages(getFeatures(post.id).messages, user);
            input.focus();
        });
        document.getElementById('chatInput').addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                document.getElementById('chatForm').requestSubmit();
            }
        });
    }

    function settlementAmounts(post, features, members) {
        const settlement = features.settlement || {};
        const total = settlement.totalAmount ?? post.totalAmount;
        if (total == null) return { total: null, rows: [] };
        const personalized = post.settlementMethod.includes('개인') || post.settlementMethod.includes('메뉴별');
        if (personalized) {
            const amounts = post.personalAmounts;
            if (members.some(member => !Number.isFinite(Number(amounts[member.id])))) {
                return { total, rows: [] };
            }
            return {
                total,
                rows: members.map(member => ({ ...member, amount: Number(amounts[member.id]) }))
            };
        }
        const base = Math.floor(total / Math.max(members.length, 1));
        const remainder = total - base * members.length;
        return {
            total,
            rows: members.map((member, index) => ({
                ...member,
                amount: base + (index < remainder ? 1 : 0)
            }))
        };
    }

    function renderSettlement(post) {
        const root = document.getElementById('settlementRoot');
        const user = getCurrentUser();
        const features = getFeatures(post.id);
        document.getElementById('backToChat').href = pageLink('chat', post.id);

        if (!user || !canEnter(post, user, features)) {
            emptyView(root, '정산 정보를 볼 수 없습니다', '참여 확정 후 공동 정산 정보를 확인할 수 있습니다.');
            return;
        }

        const host = isHost(post, user);
        const members = participantsFor(post, features).filter(person => person.status === 'approved');
        const { total, rows } = settlementAmounts(post, features, members);
        const settlement = features.settlement || { requested: false, paidIds: [] };
        const paidIds = Array.isArray(settlement.paidIds) ? settlement.paidIds : [];
        const myself = rows.find(member => member.id === user.id);
        const finished = rows.filter(member => paidIds.includes(member.id)).length;

        root.innerHTML = `
            <h1 class="order-settlement-title">공동 정산</h1>
            <p class="order-settlement-desc">${escapeHtml(post.title)} · 참여자별 금액 및 정산 상태</p>
            <div class="order-settlement-grid">
                <div>
                    <section class="order-settlement-card">
                        <div class="order-money-summary">
                            <div class="order-money-label">전체 주문 금액</div>
                            <div class="order-money-value">${total == null ? '금액 미등록' : formatMoney(total)}</div>
                            <div class="order-money-row"><span>정산 방식</span><strong>${escapeHtml(post.settlementMethod)}</strong></div>
                            <div class="order-money-row"><span>참여 확정</span><strong>${members.length}명</strong></div>
                        </div>
                        ${host && !settlement.requested ? `
                            <form id="amountForm" class="order-form-row">
                                <input name="totalAmount" type="number" min="0" step="1" placeholder="총 주문 금액 입력 (원)" required aria-label="총 주문 금액">
                                <button class="order-button order-button-outline" type="submit">금액 저장</button>
                            </form>
                        ` : ''}
                        <p class="order-hint">개인 메뉴별 정산은 작성한 모집글에 참여자별 금액이 등록되어야 표시됩니다.</p>
                    </section>
                    <section class="order-settlement-card">
                        <h2>참여자별 정산 내역</h2>
                        ${rows.length ? `
                            <ul class="order-payment-list">${rows.map(person => `
                                <li class="order-payment-item">
                                    <div class="order-payment-person">
                                        <strong>${escapeHtml(person.nickname)}${person.id === user.id ? ' (나)' : ''}</strong>
                                        <span>${escapeHtml(post.settlementMethod)}</span>
                                    </div>
                                    <div class="order-payment-amount">
                                        <strong>${formatMoney(person.amount)}</strong>
                                        <span class="${paidIds.includes(person.id) ? 'paid' : ''}">
                                            ${paidIds.includes(person.id) ? '정산 완료' : settlement.requested ? '정산 대기' : '요청 전'}
                                        </span>
                                    </div>
                                </li>
                            `).join('')}</ul>
                        ` : '<p class="order-subtitle">금액이 등록되면 참여자별 정산 내역이 표시됩니다.</p>'}
                    </section>
                </div>
                <aside>
                    <section class="order-settlement-card">
                        <h2>나의 정산 금액</h2>
                        <div class="order-money-value">${myself ? formatMoney(myself.amount) : '미정'}</div>
                        <p class="order-status-line">${settlement.requested ? `정산 진행 중 · ${finished}/${rows.length}명 완료` : '정산 요청 전'}</p>
                        <div class="order-button-row" style="flex-direction:column">
                            ${host ? `<button id="requestSettlement" type="button" class="order-button order-button-primary" ${!rows.length || settlement.requested ? 'disabled' : ''}>${settlement.requested ? '정산 요청 완료' : '정산 요청'}</button>` : ''}
                            <button id="togglePaid" type="button" class="order-button order-button-primary"
                                ${!myself || !settlement.requested ? 'disabled' : ''}>
                                ${paidIds.includes(user.id) ? '정산 대기로 변경' : '정산 완료 표시'}
                            </button>
                            <button id="showModal" type="button" class="order-button order-button-outline" ${!myself ? 'disabled' : ''}>송금 안내 문구</button>
                        </div>
                    </section>
                    <section class="order-side-card">
                        <h2>수령 안내</h2>
                        <p>수령 장소 <strong>${escapeHtml(post.pickupPlace)}</strong></p>
                        <p>수령 예정 <strong>${escapeHtml(dateLabel(post.pickupAt))}</strong></p>
                        <p>실제 송금은 처리되지 않으며 정산 상태만 브라우저에 기록됩니다.</p>
                    </section>
                </aside>
            </div>
        `;

        document.getElementById('amountForm')?.addEventListener('submit', event => {
            event.preventDefault();
            const input = event.currentTarget.elements.totalAmount;
            const amount = Number(input.value);
            if (!Number.isSafeInteger(amount) || amount < 0) return showToast('올바른 금액을 입력해 주세요.');
            updateFeatures(post.id, data => {
                data.settlement = { ...data.settlement, totalAmount: amount };
            });
            renderSettlement(post);
            showToast('주문 금액을 저장했습니다.');
        });

        document.getElementById('requestSettlement')?.addEventListener('click', () => {
            if (!host || !rows.length) return;
            updateFeatures(post.id, data => {
                data.settlement = { ...data.settlement, requested: true, paidIds: [] };
            });
            renderSettlement(post);
            showToast('정산 요청 상태로 변경했습니다.');
        });

        document.getElementById('togglePaid')?.addEventListener('click', () => {
            if (!settlement.requested || !myself) return;
            updateFeatures(post.id, data => {
                const paid = new Set(data.settlement?.paidIds || []);
                if (paid.has(user.id)) paid.delete(user.id);
                else paid.add(user.id);
                data.settlement = { ...data.settlement, paidIds: [...paid] };
            });
            renderSettlement(post);
            showToast('정산 상태를 변경했습니다.');
        });

        document.getElementById('showModal')?.addEventListener('click', () => {
            if (myself) openSettlementModal(post, myself.amount);
        });
    }

    function openSettlementModal(post, amount) {
        const modal = document.getElementById('settlementModal');
        const message = `공동 주문 정산 안내\n모집글: ${post.title}\n개인 정산 금액: ${formatMoney(amount)}\n수령 장소: ${post.pickupPlace}\n※ 실제 송금과 연동되지 않는 안내입니다.`;
        document.getElementById('settlementMessage').textContent = message;
        modal.hidden = false;
        const close = () => { modal.hidden = true; };
        document.getElementById('closeModal').onclick = close;
        document.getElementById('cancelModal').onclick = close;
        modal.onclick = event => { if (event.target === modal) close(); };
        document.getElementById('copyMessage').onclick = async () => {
            try {
                await navigator.clipboard.writeText(message);
                showToast('안내 문구를 복사했습니다.');
            } catch (error) {
                showToast('복사에 실패했습니다. 문구를 직접 복사해 주세요.');
            }
            close();
        };
    }

    async function init() {
        const root = document.getElementById({
            detail: 'detailRoot', chat: 'chatRoot', settlement: 'settlementRoot'
        }[page]);
        if (!root) return;
        if (!postId) {
            emptyView(root, '선택된 모집글이 없습니다', '목록에서 모집글을 선택하면 이곳에 정보가 표시됩니다.');
            return;
        }
        try {
            currentUser = normalizeUser(await Auth.getCurrentUser());
            const post = await getPost(postId);
            if (!post) {
                emptyView(root, '모집글을 찾을 수 없습니다', '게시글이 삭제되었거나 아직 팀의 데이터와 연결되지 않았습니다.');
                return;
            }
            if (page === 'detail') renderDetail(post);
            if (page === 'chat') renderChat(post);
            if (page === 'settlement') renderSettlement(post);
        } catch (error) {
            console.error('모집글 로딩 오류:', error);
            emptyView(root, '정보를 불러올 수 없습니다', '데이터 연결 상태를 확인한 후 다시 시도해 주세요.');
        }
    }

    window.addEventListener('storage', event => {
        if ([STATE_KEY, 'authToken'].includes(event.key)) init();
    });
    init();
})();
