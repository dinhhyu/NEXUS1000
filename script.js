// =====================================================================
// KHỞI TẠO TABS & MODAL
// =====================================================================
const matrixGrid = document.getElementById('matrix-grid');
const countReports = document.getElementById('count-reports');
const modal = document.getElementById('input-modal');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');

document.getElementById('tab-vault').addEventListener('click', (e) => {
    e.target.classList.add('active'); document.getElementById('tab-discovery').classList.remove('active');
    document.getElementById('view-vault').classList.remove('hidden'); document.getElementById('view-discovery').classList.add('hidden');
});
document.getElementById('tab-discovery').addEventListener('click', (e) => {
    e.target.classList.add('active'); document.getElementById('tab-vault').classList.remove('active');
    document.getElementById('view-discovery').classList.remove('hidden'); document.getElementById('view-vault').classList.add('hidden');
});

btnOpenModal.addEventListener('click', () => modal.classList.remove('hidden'));
btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));

// =====================================================================
// CẤU HÌNH API & FIREBASE (CHỈ DÙNG FIRESTORE DATABASE - 100% FREE)
// =====================================================================
const GEMINI_API_KEY = "AIzaSyCB3RqljI_IPufLslL3o6NgvvW4UdCUpSM";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA31Q2VQS4cDQ6hSTjtBhnnp9urJu2Xrks",
  authDomain: "nexus-1000-3c674.firebaseapp.com",
  databaseURL: "https://nexus-1000-3c674-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nexus-1000-3c674",
  storageBucket: "nexus-1000-3c674.firebasestorage.app",
  messagingSenderId: "281114575872",
  appId: "1:281114575872:web:024eec934aeb6a5293c4e5"
};

let db, reportsCollection;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    reportsCollection = collection(db, "reports");
} catch (error) {
    console.error("Lỗi Firebase:", error);
}

// =====================================================================
// HIỂN THỊ MATRIX 1000 NGÀY
// =====================================================================
const TOTAL_DAYS = 1000;
async function loadAndRenderMatrix() {
    matrixGrid.innerHTML = '';
    let currentCount = 0;
    try {
        if (!reportsCollection) throw new Error("No DB");
        const snapshot = await getDocs(reportsCollection);
        currentCount = snapshot.size;
        countReports.innerText = currentCount;
    } catch (e) {
        currentCount = 0;
    }

    for (let i = 1; i <= TOTAL_DAYS; i++) {
        const box = document.createElement('div');
        box.classList.add('matrix-box');
        if (i <= currentCount) box.classList.add('done');
        matrixGrid.appendChild(box);
    }
}
loadAndRenderMatrix();

// =====================================================================
// PDF VIEWER (ĐỌC LOCAL TRÊN MÁY BẠN, KHÔNG UPLOAD)
// =====================================================================
const pdfInput = document.getElementById('pdf-file');
const pdfViewer = document.getElementById('pdf-viewer');
let currentPdfText = ""; 
let selectedPdfFile = null;

pdfInput.addEventListener('change', async (e) => {
    selectedPdfFile = e.target.files[0];
    if(selectedPdfFile) {
        // Tạo link ảo để xem thẳng từ ổ cứng của bạn (Nhanh & Miễn phí)
        pdfViewer.src = URL.createObjectURL(selectedPdfFile);
        pdfViewer.classList.remove('hidden');
        
        // Trích xuất text ngầm cho AI
        document.querySelector('.ai-msg').innerText = "Đang đọc PDF của bạn...";
        const arrayBuffer = await selectedPdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let text = "";
        const maxPages = Math.min(pdf.numPages, 30); 
        for(let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
        }
        currentPdfText = text;
        document.querySelector('.ai-msg').innerText = "Đã đọc xong! Bạn cần dịch hay hỏi gì về tài liệu này?";
    }
});

// NÚT LƯU VÀO VAULT (CHỈ LƯU CHỮ, KHÔNG LƯU FILE)
document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "⏳ Đang Lưu Cất Chất Xám..."; btnSubmit.disabled = true;

    try {
        // Lưu thẳng vào Database, bỏ qua khâu Storage lằng nhằng
        await addDoc(reportsCollection, {
            title: document.getElementById('report-title').value,
            topic: document.getElementById('report-topic').value,
            notes: document.getElementById('general-notes').value, 
            takeaways: [
                document.getElementById('tk-1').value,
                document.getElementById('tk-2').value,
                document.getElementById('tk-3').value
            ],
            ahaMoment: document.getElementById('aha-moment').value,
            createdAt: serverTimestamp()
        });

        document.getElementById('report-form').reset();
        document.getElementById('pdf-file').value = ""; 
        document.getElementById('pdf-viewer').classList.add('hidden');
        document.getElementById('ai-suggestion-box').classList.add('hidden');
        modal.classList.add('hidden');
        await loadAndRenderMatrix();
    } catch (error) {
        alert("Lỗi khi lưu! Bấm F12 kiểm tra.");
        console.error(error);
    } finally {
        btnSubmit.innerText = "💾 LƯU VÀO VAULT"; btnSubmit.disabled = false;
    }
});

// =====================================================================
// AI CHATBOT (DÙNG 2.5 FLASH)
// =====================================================================
async function sendChatMessage() {
    const userText = chatInput.value.trim();
    if (!userText) return;

    // In tin nhắn của User
    chatHistory.innerHTML += `<div class="chat-msg user-msg">${userText}</div>`;
    chatInput.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight; 

    // In trạng thái chờ
    const loadingId = "msg-" + Date.now();
    chatHistory.innerHTML += `<div id="${loadingId}" class="chat-msg ai-msg">⏳ Đang suy nghĩ...</div>`;
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const prompt = `
    Bạn là trợ lý học tập chuyên nghiệp. 
    Dưới đây là nội dung tài liệu người dùng đang đọc (Dùng làm ngữ cảnh nếu cần): 
    """${currentPdfText.substring(0, 30000)}"""
    
    Yêu cầu của người dùng: "${userText}"
    (Nếu họ nhờ dịch, hãy dịch sang tiếng Việt tự nhiên. Nếu họ hỏi, hãy trả lời ngắn gọn, dễ hiểu dựa trên tài liệu).
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        
        // --- BỘ BẮT LỖI CHI TIẾT ---
        if (!response.ok) {
            console.error("Lỗi từ Google API:", data);
            throw new Error(`Google từ chối: ${data.error?.message || "Lỗi không xác định"}`);
        }
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Google AI chặn vì nội dung PDF nhạy cảm/vi phạm chính sách.");
        }
        
        // In kết quả nếu thành công
        const aiText = data.candidates[0].content.parts[0].text;
        
        // Chuyển dấu \n của AI thành thẻ <br> để xuống dòng đẹp hơn trong khung chat
        document.getElementById(loadingId).innerHTML = aiText.replace(/\n/g, '<br>');
        
    } catch (e) {
        console.error("Chi tiết lỗi:", e);
        // In thẳng lỗi ra màn hình chat
        document.getElementById(loadingId).innerHTML = `<b>❌ LỖI:</b> ${e.message}`;
    }
}

btnChatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

// =====================================================================
// AI HỖ TRỢ TÓM TẮT GỢI Ý (KHÔNG ĐÈ FORM)
// =====================================================================
const btnAiFill = document.getElementById('btn-ai-fill');
const aiStatus = document.getElementById('ai-status');
const aiSuggestionBox = document.getElementById('ai-suggestion-box');

btnAiFill.addEventListener('click', async () => {
    if (!currentPdfText) {
        alert("Vui lòng tải file PDF lên để AI có dữ liệu tham khảo!");
        return;
    }

    btnAiFill.disabled = true;
    btnAiFill.innerText = "⏳ Đang gửi cho Gemini đọc...";
    aiStatus.innerText = "Đang phân tích (5-10s)...";
    aiSuggestionBox.classList.add('hidden');

    try {
        const prompt = `
        Đọc tài liệu sau và đưa ra gợi ý tóm tắt.
        YÊU CẦU BẮT BUỘC: Bạn CHỈ được trả về định dạng JSON.
        
        Cấu trúc JSON:
        {
          "title": "Tên Báo Cáo - Tên Tác giả",
          "takeaways": ["Gợi ý luận điểm 1", "Gợi ý luận điểm 2", "Gợi ý luận điểm 3"],
          "ahaMoment": "Gợi ý insight đắt giá nhất"
        }
        
        Nội dung tài liệu: """ ${currentPdfText.substring(0, 50000)} """
        `; 

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(`Lỗi AI: ${data.error?.message}`);

        const aiText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(aiText);

        document.getElementById('ai-title').innerText = result.title || "Không tìm thấy";
        const ul = document.getElementById('ai-takeaways');
        ul.innerHTML = '';
        if(result.takeaways) {
            result.takeaways.forEach(tk => {
                const li = document.createElement('li');
                li.innerText = tk;
                ul.appendChild(li);
            });
        }
        document.getElementById('ai-aha').innerText = result.ahaMoment || "Không tìm thấy";
        
        aiSuggestionBox.classList.remove('hidden');
        btnAiFill.innerText = "✅ Đã có góc nhìn từ AI!";
        aiStatus.innerText = "";
        
    } catch (error) {
        alert("Lỗi gọi AI.");
        aiStatus.innerText = "";
    } finally {
        setTimeout(() => { btnAiFill.innerText = "✨ Xin Góc Nhìn Của AI (Tham Khảo)"; btnAiFill.disabled = false; }, 3000);
    }
});

// =====================================================================
// DISCOVERY (TÌM BÁO CÁO)
// =====================================================================
const btnAiSearch = document.getElementById('btn-ai-search');
const topicSearch = document.getElementById('topic-search');
const searchResults = document.getElementById('search-results');

btnAiSearch.addEventListener('click', async () => {
    const query = topicSearch.value.trim();
    if (!query) return;

    btnAiSearch.innerText = "⏳ Đang tìm..."; btnAiSearch.disabled = true;
    searchResults.classList.add('hidden'); searchResults.innerHTML = '';

    const prompt = `
    Đề xuất 3 báo cáo học thuật hoặc whitepaper uy tín nhất về: "${query}".
    CHỈ TRẢ VỀ JSON LÀ MẢNG (ARRAY).
    Cấu trúc mẫu:
    [
      { "title": "Tên báo cáo", "desc": "Lý do đáng đọc", "searchQuery": "Lệnh tìm trên Google PDF" }
    ]
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        const resultsArray = JSON.parse(aiText);

        resultsArray.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('result-card');
            card.innerHTML = `
                <h4>${item.title}</h4>
                <p>${item.desc}</p>
                <a href="https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}" target="_blank">🔗 Tìm bản gốc (PDF) trên Google</a>
            `;
            searchResults.appendChild(card);
        });
        searchResults.classList.remove('hidden');
    } catch (error) {
        alert("Lỗi tìm kiếm.");
    } finally {
        btnAiSearch.innerText = "🔍 Tìm kiếm Báo cáo"; btnAiSearch.disabled = false;
    }
});
