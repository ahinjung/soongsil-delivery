/*
 * 웹프로그래밍 22조 - 공동 주문 담당 페이지
 * 별도 백엔드 없이 시연 가능한 localStorage 예시.
 * 본 서비스 연동 시 아래 loadState/saveState/getUser를 팀의 데이터 API로 교체.
 * Storage: together-order-member4-v1 / Demo user: demo-member-01
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'together-order-member4-v1';
  const DEMO_USER = { id: 'demo-member-01', nickname: '나(시연)' };
  const money = amount => Number(amount).toLocaleString('ko-KR') + '원';
  const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const link = (page, id) => `${page}.html?id=${encodeURIComponent(id)}`;
  const future = hours => new Date(Date.now() + hours * 3600_000).toISOString();
  const time = value => new Date(value).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const shortTime = value => new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const currentId = new URLSearchParams(location.search).get('id') || 'delivery-101';
  const page = document.body.dataset.page;
  const authorRole = id => id === DEMO_USER.id;

  function initialState() {
    return {
      posts: [
        {
          id: 'delivery-101', type: '배달', category: '치킨/피자', title: '오늘 저녁 치킨 같이 주문할 사람!',
          description: '배달비를 아끼려고 함께 주문할 분들을 모집합니다.\n주문은 모임 인원 확정 후 진행하고, 도착하면 학생회관 앞에서 나눠 가져가요.\n메뉴나 수량은 채팅방에서 최종 확인해요.',
          organizer: { id: 'host-01', nickname: '다온' }, pickupPlace: '학생회관 1층 입구', pickupAt: future(28), deadline: future(24),
          maxMembers: 4, itemTotal: 28000, deliveryFee: 4000, splitDescription: '총 금액을 참여 확정 인원수로 균등 분할',
          participants: [{ id: 'host-01', nickname: '다온', status: 'approved' }, { id: 'member-02', nickname: '유진', status: 'approved' }],
          settlement: { requested: false, paidIds: [] }
        },
        {
          id: 'group-201', type: '공동구매', category: '생필품', title: '세탁세제 대용량 공동구매 모집',
          description: '세탁세제 대용량 묶음을 같이 구매하고자 합니다.\n공동구매 후 수령 장소에서 각자 가져가는 방식입니다.\n최종 제품과 구매가는 참여자들과 채팅으로 확인해요.',
          organizer: { id: 'host-02', nickname: '서연' }, pickupPlace: '정보과학관 정문', pickupAt: future(76), deadline: future(62),
          maxMembers: 5, itemTotal: 45000, deliveryFee: 3000, splitDescription: '총 금액을 참여 확정 인원수로 균등 분할',
          participants: [{ id: 'host-02', nickname: '서연', status: 'approved' }, { id: 'member-03', nickname: '민수', status: 'approved' }],
          settlement: { requested: false, paidIds: [] }
        }
      ],
      messages: {
        'delivery-101': [
          { id: 'm1', authorId: 'host-01', author: '다온', text: '안녕하세요! 참여가 확정되면 메뉴를 함께 정해요 🙂', sentAt: new Date(Date.now() - 45 * 60_000).toISOString() },
          { id: 'm2', authorId: 'member-02', author: '유진', text: '좋아요. 저는 순살 메뉴 생각하고 있어요!', sentAt: new Date(Date.now() - 35 * 60_000).toISOString() }
        ],
        'group-201': [
          { id: 'm3', authorId: 'host-02', author: '서연', text: '세제 종류는 인원 확정 후 채팅에서 정할게요.', sentAt: new Date(Date.now() - 12 * 60_000).toISOString() }
        ]
      }
    };
  }

  function loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && Array.isArray(data.posts) && data.messages && typeof data.messages === 'object') return data;
    } catch (error) { console.warn('저장된 데모 데이터를 읽지 못해 초기화합니다.', error); }
    const data = initialState();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (error) { console.warn('브라우저 저장소를 사용할 수 없습니다.', error); }
    return data;
  }
  function saveState(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (error) { window.alert('상태 저장에 실패했습니다. Live Server 환경에서 실행하거나 브라우저 저장소 설정을 확인해 주세요.'); console.error(error); }
  }
  function postById(state) { return state.posts.find(item => item.id === currentId); }
  function myMember(post) { return post.participants.find(item => item.id === DEMO_USER.id); }
  function approved(post) { return post.participants.filter(item => item.status === 'approved'); }
  function reserved(post) { return post.participants.filter(item => item.status === 'approved' || item.status === 'pending'); }
  function isClosed(post) { return Date.now() >= new Date(post.deadline).getTime() || reserved(post).length >= post.maxMembers || post.settlement.requested; }
  function postStatus(post) { return post.settlement.requested ? '정산 진행 중' : isClosed(post) ? '모집 마감' : '모집 중'; }
  function toast(message) {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 2700);
  }
  function error(root, message) { root.className = 'order-error'; root.innerHTML = `<h2>모집글을 찾을 수 없습니다</h2><p class="order-muted">${html(message)}</p><a class="order-button order-button-primary" href="${link('post_detail','delivery-101')}">예시 모집글 보기</a>`; }
  function memberMarkup(member) {
    return `<li class="order-member"><span class="order-avatar" aria-hidden="true">${html(member.nickname.slice(0,1))}</span><span class="order-member-detail"><span class="order-member-name">${html(member.nickname)}</span>${member.id === DEMO_USER.id ? '<span class="order-small"> · 내 계정</span>' : ''}</span><span class="order-status ${member.status === 'pending' ? 'pending' : ''}">${member.status === 'pending' ? '승인 대기' : '참여 확정'}</span></li>`;
  }

  function initDetail() {
    const root = document.getElementById('detailRoot');
    const state = loadState(), post = postById(state);
    if (!post) { error(root, currentId); return; }
    document.title = `${post.title} | 같이 주문하기`;
    const member = myMember(post);
    const count = approved(post).length;
    const booked = reserved(post).length;
    const available = !isClosed(post) && !member;
    const percent = Math.min((booked / post.maxMembers) * 100, 100);
    const status = postStatus(post);
    let participationActions = '';
    if (available) participationActions = `<button type="button" class="order-button order-button-primary order-button-full" id="joinBtn">참여 신청하기</button>`;
    else if (!member && isClosed(post)) participationActions = `<button type="button" class="order-button order-button-secondary order-button-full" disabled>모집이 마감되었습니다</button>`;
    else if (member?.status === 'pending') participationActions = `<div class="order-callout order-callout-warn">참여 신청이 접수되었습니다. 모집자의 승인을 기다리고 있어요.</div><div class="order-actions"><button type="button" class="order-button order-button-secondary" id="cancelJoinBtn">신청 취소</button><button type="button" class="order-button order-button-soft" id="approveDemoBtn">시연용 승인 처리</button></div>`;
    else if (member?.status === 'approved') participationActions = `<div class="order-callout order-callout-success">참여가 확정되었습니다. 이제 채팅방과 정산 화면을 이용할 수 있어요.</div><div class="order-actions"><a class="order-button order-button-primary" href="${link('chat',post.id)}">채팅방 입장</a><a class="order-button order-button-soft" href="${link('settlement',post.id)}">정산 확인</a>${!post.settlement.requested && !authorRole(post.organizer.id) ? '<button type="button" class="order-button order-button-danger" id="cancelJoinBtn">참여 취소</button>' : ''}</div>`;
    root.innerHTML = `
      <div class="order-stack">
        <article class="order-card order-hero">
          <div class="order-label-row"><span class="order-pill">${html(post.type)}</span><span class="order-pill">${html(post.category)}</span><span class="order-pill ${status === '모집 중' ? 'order-pill-success' : 'order-pill-warn'}">${html(status)}</span></div>
          <h2>${html(post.title)}</h2><p class="order-muted">작성자 ${html(post.organizer.nickname)} · 학교 주변 공동 주문</p>
          <p class="order-post-copy">${html(post.description)}</p>
          <div class="order-meta">
            <div><span class="order-field-label">모집 마감</span><span class="order-field-value">${html(time(post.deadline))}</span></div>
            <div><span class="order-field-label">수령 예정</span><span class="order-field-value">${html(time(post.pickupAt))}</span></div>
            <div><span class="order-field-label">수령 장소</span><span class="order-field-value">${html(post.pickupPlace)}</span></div>
            <div><span class="order-field-label">정산 방식</span><span class="order-field-value">참여 인원별 1/N</span></div>
          </div>
        </article>
        <section class="order-card"><h3>주문 및 정산 안내</h3><p class="order-muted">${html(post.splitDescription)}. 주문 금액은 현재 시연용 예시 데이터이며 실제로 결제되지 않습니다.</p><div class="order-fees"><div class="order-fee-row"><span>상품 금액</span><strong>${money(post.itemTotal)}</strong></div><div class="order-fee-row"><span>배달/배송비</span><strong>${money(post.deliveryFee)}</strong></div><div class="order-fee-row order-total"><span>예상 총 금액</span><strong>${money(post.itemTotal + post.deliveryFee)}</strong></div></div></section>
        <section class="order-card"><h3>참여자 현황</h3><ul class="order-member-list">${post.participants.map(memberMarkup).join('')}</ul></section>
      </div>
      <aside class="order-stack">
        <section class="order-card"><div class="order-progress-head"><div><span class="order-field-label">모집 인원</span><div class="order-progress-big">${count}<span> / ${post.maxMembers}명 확정</span></div></div><span class="order-pill">${html(status)}</span></div><div class="order-progress-track" aria-label="신청 현황"><div class="order-progress-fill" style="width:${percent}%"></div></div><div class="order-small">승인 대기자를 포함하여 ${booked}/${post.maxMembers}자리 신청됨</div>${participationActions}<div class="order-note">시연용 승인 버튼은 서버/관리자 기능이 없는 상태에서 화면 흐름을 확인하기 위한 기능입니다.</div></section>
        <section class="order-card"><h3>진행 순서</h3><div class="order-fees"><div>① 모집글 확인 및 참여 신청</div><div>② 모집자의 참여 승인</div><div>③ 참여자 채팅 및 주문 확인</div><div>④ 주문 금액 1/N 정산</div></div><div class="order-callout">실제 여러 사용자가 참여하는 기능은 백엔드 및 로그인 시스템 연동 후 구현됩니다.</div></section>
      </aside>`;
    document.getElementById('joinBtn')?.addEventListener('click', () => {
      const s = loadState(), p = postById(s);
      if (!p || isClosed(p) || myMember(p)) return toast('참여 신청을 진행할 수 없습니다.');
      p.participants.push({ id: DEMO_USER.id, nickname: DEMO_USER.nickname, status: 'pending' });
      saveState(s); initDetail(); toast('참여 신청이 접수되었습니다.');
    });
    document.getElementById('approveDemoBtn')?.addEventListener('click', () => {
      const s = loadState(), p = postById(s), m = p && myMember(p);
      if (!m || m.status !== 'pending' || p.settlement.requested) return;
      m.status = 'approved'; saveState(s); initDetail(); toast('시연용 참여 승인이 완료되었습니다.');
    });
    document.getElementById('cancelJoinBtn')?.addEventListener('click', () => {
      const s = loadState(), p = postById(s);
      if (!p || p.settlement.requested) return toast('정산 진행 중에는 참여를 취소할 수 없습니다.');
      p.participants = p.participants.filter(item => item.id !== DEMO_USER.id);
      saveState(s); initDetail(); toast('참여 신청이 취소되었습니다.');
    });
    document.getElementById('relatedPosts').innerHTML = state.posts.filter(item => item.id !== post.id).map(item => `<a class="order-related-link" href="${link('post_detail',item.id)}"><span class="order-pill">${html(item.type)}</span><h3>${html(item.title)}</h3><span class="order-small">${html(item.pickupPlace)} · ${approved(item).length}/${item.maxMembers}명 확정 →</span></a>`).join('') || '<p class="order-muted">다른 모집글이 없습니다.</p>';
  }

  function initChat() {
    const root = document.getElementById('chatRoot');
    const state = loadState(), post = postById(state);
    if (!post) { error(root, currentId); return; }
    document.getElementById('detailBreadcrumb').href = link('post_detail',post.id);
    if (myMember(post)?.status !== 'approved') {
      root.innerHTML = `<section class="order-chat-panel order-lock"><h2>참여 확정 후 이용할 수 있어요</h2><p class="order-muted">참여자 전용 채팅방입니다. 모집글에서 참여 신청 및 승인 상태를 확인해 주세요.</p><div class="order-actions"><a class="order-button order-button-primary" href="${link('post_detail',post.id)}">모집글 상세로 돌아가기</a></div></section>`;
      return;
    }
    root.innerHTML = `
      <section class="order-chat-panel">
        <header class="order-chat-heading"><div><h2>${html(post.title)}</h2><p>참여 확정 ${approved(post).length}명 · 브라우저 내 메시지 시연</p></div><span class="order-pill order-pill-success">참여중</span></header>
        <div class="order-chat-messages" id="messageList" role="log" aria-label="채팅 메시지"></div>
        <form id="chatForm" class="order-compose"><textarea id="chatInput" aria-label="메시지 입력" rows="2" maxlength="500" placeholder="메시지를 입력하세요 (Enter 전송 / Shift+Enter 줄바꿈)" required></textarea><button class="order-button order-button-primary" type="submit">전송</button></form>
      </section>
      <aside class="order-chat-side">
        <section class="order-card"><h3>참여자 ${approved(post).length}명</h3><ul class="order-member-list">${approved(post).map(memberMarkup).join('')}</ul></section>
        <section class="order-card"><h3>주문 안내</h3><div class="order-fees"><div><span class="order-field-label">수령 장소</span><div class="order-field-value">${html(post.pickupPlace)}</div></div><div><span class="order-field-label">수령 예정</span><div class="order-field-value">${html(time(post.pickupAt))}</div></div></div><div class="order-actions"><a class="order-button order-button-primary order-button-full" href="${link('settlement',post.id)}">공동 정산 보기</a><a class="order-button order-button-secondary order-button-full" href="${link('post_detail',post.id)}">모집글 상세</a></div><p class="order-note">이 채팅은 서버 통신이 아닌 localStorage 시연입니다. 다른 기기/브라우저와 메시지를 공유하지 않습니다.</p></section>
      </aside>`;
    renderMessages();
    document.getElementById('chatForm').addEventListener('submit', event => {
      event.preventDefault();
      const input = document.getElementById('chatInput');
      const content = input.value.trim();
      if (!content) return;
      const s = loadState(), p = postById(s);
      if (myMember(p)?.status !== 'approved') return toast('참여 확정 상태를 확인해 주세요.');
      if (!s.messages[p.id]) s.messages[p.id] = [];
      s.messages[p.id].push({ id: `m-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, authorId: DEMO_USER.id, author: DEMO_USER.nickname, text: content, sentAt: new Date().toISOString() });
      saveState(s); input.value = ''; renderMessages(); input.focus();
    });
    document.getElementById('chatInput').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault(); document.getElementById('chatForm').requestSubmit();
      }
    });
  }
  function renderMessages() {
    const el = document.getElementById('messageList');
    if (!el) return;
    const state = loadState(), msgs = state.messages[currentId] || [];
    el.innerHTML = msgs.map(msg => {
      const own = msg.authorId === DEMO_USER.id;
      return `<div class="order-message ${own?'self':''}"><span class="order-message-avatar" aria-hidden="true">${html(msg.author.slice(0,1))}</span><div class="order-message-body"><div class="order-message-meta">${html(msg.author)} · ${html(shortTime(msg.sentAt))}</div><div class="order-bubble">${html(msg.text)}</div></div></div>`;
    }).join('');
    if (!msgs.length) el.innerHTML = '<p class="order-muted">첫 번째 메시지를 작성해 보세요.</p>';
    el.scrollTop = el.scrollHeight;
  }

  function perMember(post) {
    const members = approved(post), total = post.itemTotal + post.deliveryFee;
    const base = Math.floor(total / Math.max(members.length, 1));
    const remain = total - base * members.length;
    return members.map((member, index) => ({ ...member, amount: base + (index < remain ? 1 : 0) }));
  }
  function initSettlement() {
    const root = document.getElementById('settlementRoot');
    const state = loadState(), post = postById(state);
    if (!post) { error(root, currentId); return; }
    document.getElementById('settlementBreadcrumb').href = link('post_detail',post.id);
    if (myMember(post)?.status !== 'approved') {
      root.innerHTML = `<section class="order-card order-lock"><h2>참여 확정 후 정산 정보를 볼 수 있어요</h2><p class="order-muted">먼저 모집글에서 참여 승인 상태를 확인해 주세요.</p><a class="order-button order-button-primary" href="${link('post_detail',post.id)}">모집글 상세로 돌아가기</a></section>`;
      return;
    }
    const rows = perMember(post), self = rows.find(x => x.id === DEMO_USER.id), paidIds = post.settlement.paidIds || [];
    const paidCount = rows.filter(x => paidIds.includes(x.id)).length;
    const total = post.itemTotal + post.deliveryFee;
    const requestStatus = post.settlement.requested;
    root.innerHTML = `
      <div class="order-stack">
        <section class="order-card order-money-hero"><span class="order-field-label">이번 공동 주문의 예상 총 금액</span><h2>${money(total)}</h2><span class="order-muted">${html(post.title)}</span><div class="order-money-split"><div><span class="order-field-label">상품 금액</span><strong>${money(post.itemTotal)}</strong></div><div><span class="order-field-label">배달/배송비</span><strong>${money(post.deliveryFee)}</strong></div></div></section>
        <section class="order-card"><div class="order-section-heading"><h2>참여자별 정산 내역</h2><span>현재 확정 인원 ${rows.length}명</span></div><div>${rows.map(row => `<div class="order-payment-row"><span class="order-avatar">${html(row.nickname.slice(0,1))}</span><div class="order-payment-person"><div class="order-payment-name">${html(row.nickname)}${row.id === DEMO_USER.id ? ' (나)' : ''}</div><span class="order-small">1/N 균등 분배</span></div><div class="order-payment-sum"><strong>${money(row.amount)}</strong><span class="order-status ${requestStatus && paidIds.includes(row.id) ? '' : 'pending'}">${requestStatus && paidIds.includes(row.id) ? '정산 완료' : requestStatus ? '정산 대기' : '요청 전'}</span></div></div>`).join('')}</div></section>
      </div>
      <aside class="order-stack">
        <section class="order-card"><h3>나의 정산 금액</h3><div class="order-progress-big">${money(self.amount)}</div><p class="order-muted">${html(post.splitDescription)}. 원 단위 나머지는 순서대로 1원씩 배분합니다.</p><div class="order-actions"><button type="button" id="requestSettlement" class="order-button order-button-primary order-button-full" ${requestStatus?'disabled':''}>${requestStatus ? '정산 요청 완료' : '정산 요청 (시연)'}</button><button type="button" id="togglePaid" class="order-button order-button-soft order-button-full" ${!requestStatus?'disabled':''}>${paidIds.includes(DEMO_USER.id) ? '정산 대기로 변경 (시연)' : '내 정산 완료 표시 (시연)'}</button><button type="button" id="showModal" class="order-button order-button-secondary order-button-full">송금 안내 문구 보기</button></div><div class="order-callout order-callout-warn">실제 결제·계좌이체는 이루어지지 않습니다. 정산 완료는 시연용 상태 표시입니다.</div></section>
        <section class="order-card"><h3>정산 진행 상황</h3><div class="order-payment-summary"><div class="order-mini-stat"><span class="order-small">완료</span><strong>${requestStatus ? paidCount : 0}명</strong></div><div class="order-mini-stat"><span class="order-small">대기</span><strong>${requestStatus ? rows.length - paidCount : rows.length}명</strong></div></div><div class="order-progress-track"><div class="order-progress-fill" style="width:${requestStatus ? (paidCount/rows.length*100) : 0}%"></div></div><p class="order-note">주최자의 실제 정산 요청 및 은행/송금 서비스 연결은 추후 팀 통합 작업이 필요합니다.</p><a class="order-button order-button-secondary order-button-full" href="${link('chat',post.id)}">채팅으로 돌아가기</a></section>
      </aside>`;
    document.getElementById('requestSettlement')?.addEventListener('click', () => {
      const s = loadState(), p = postById(s);
      if (!p || p.settlement.requested) return;
      p.settlement.requested = true;
      saveState(s); initSettlement(); toast('시연용 정산 요청 상태로 변경했습니다.');
    });
    document.getElementById('togglePaid')?.addEventListener('click', () => {
      const s = loadState(), p = postById(s);
      if (!p?.settlement.requested || myMember(p)?.status !== 'approved') return;
      const done = new Set(p.settlement.paidIds || []);
      if (done.has(DEMO_USER.id)) done.delete(DEMO_USER.id); else done.add(DEMO_USER.id);
      p.settlement.paidIds = [...done];
      saveState(s); initSettlement(); toast('나의 정산 표시를 변경했습니다.');
    });
    document.getElementById('showModal').addEventListener('click', () => showModal(post, self.amount));
  }
  function showModal(post, amount) {
    const modal = document.getElementById('settlementModal');
    const message = `안녕하세요! [${post.title}] 공동 주문 정산 안내입니다.\n1인 정산 금액: ${money(amount)}\n수령 장소: ${post.pickupPlace}\n※ 실제 송금 기능이 연결되지 않은 과제 시연용 안내입니다.`;
    document.getElementById('settlementMessage').textContent = message;
    modal.hidden = false;
    const close = () => { modal.hidden = true; };
    document.getElementById('closeModal').onclick = close;
    document.getElementById('cancelModal').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    document.getElementById('copyMessage').onclick = async () => {
      try { await navigator.clipboard.writeText(message); toast('안내 문구를 복사했습니다.'); }
      catch (e) { toast('복사가 차단되었습니다. 안내 문구를 직접 선택해 복사해 주세요.'); }
      close();
    };
    const handleEscape = event => { if (event.key === 'Escape') { close(); document.removeEventListener('keydown', handleEscape); } };
    document.addEventListener('keydown', handleEscape);
    document.getElementById('closeModal').focus();
  }
  // 세 단계 바로가기 링크에도 현재 모집글 ID를 전달합니다.
  document.querySelectorAll('a.order-step').forEach(a => {
    const name = a.getAttribute('href').replace(/\.html$/, '');
    a.setAttribute('href', link(name, currentId));
  });
  try {
    if (page === 'detail') initDetail();
    else if (page === 'chat') initChat();
    else if (page === 'settlement') initSettlement();
    window.addEventListener('storage', event => {
      if (event.key !== STORAGE_KEY) return;
      if (page === 'detail') initDetail();
      if (page === 'chat') initChat();
      if (page === 'settlement') initSettlement();
    });
  } catch (error) { console.error('공동 주문 페이지 초기화 오류:', error); toast('화면을 불러오는 중 문제가 발생했습니다.'); }
})();
