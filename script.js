// =====================================================================
// KHỞI TẠO TABS & MODAL
// =====================================================================
const matrixGrid = document.getElementById('matrix-grid');
const countReports = document.getElementById('count-reports');
const modal = document.getElementById('input-modal');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');

document.getElementById('tab-vault').addEventListener('click', (e) => {
    e.target.classList.add('active'); 
    document.getElementById('tab-discovery').classList.remove('active');
    document.getElementById('view-vault').classList.remove('hidden'); 
    document.getElementById('view-discovery').classList.add('hidden');
});

document.getElementById('tab-discovery').addEventListener('click', (e) => {
    e.target.classList.add('active'); 
    document.getElementById('tab-vault').classList.remove('active');
    document.getElementById('view-discovery').classList.remove('hidden'); 
    document.getElementById('view-vault').classList.add('hidden');
});

btnOpenModal.addEventListener('click', () => modal.classList.remove('hidden'));
btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));

// =====================================================================
// CẤU HÌNH API & FIREBASE
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
    console.error("Lỗi khởi tạo Firebase:", error);
}

// =====================================================================
// HIỂN THỊ MATRIX 1000 NGÀY
// =====================================================================
const TOTAL_DAYS = 1000;
async function loadAndRenderMatrix() {
    matrixGrid.innerHTML = '';
    let currentCount = 0;
    try {
        if (!reportsCollection) return;
        const snapshot = await getDocs(reportsCollection);
        currentCount = snapshot.size;
        countReports.innerText = currentCount;
    } catch (e) {
        console.error("Lỗi khi load Matrix:", e);
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
// PDF VIEWER & XỬ LÝ FILE
// =====================================================================
const pdfInput = document.getElementById('pdf-file');
const pdfViewer = document.getElementById('pdf-viewer');
let currentPdfText = ""; 
let selectedPdfFile = null;

pdfInput.addEventListener('change', async (e) => {
    selectedPdfFile = e.target.files[0];
    if(selectedPdfFile) {
        // Hiển thị PDF local
        pdfViewer.src = URL.createObjectURL(selectedPdfFile);
        pdfViewer.classList.remove('hidden');
        
        // Trích xuất text cho AI
        const statusMsg = document.querySelector('.ai-msg');
        statusMsg.innerText = "⏳ Đang đọc nội dung PDF...";
        
        try {
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
            statusMsg.innerText = "✅ Đã nạp xong tài liệu! Bạn cần mình dịch thuật hay giải thích phần nào?";
        } catch (err) {
            statusMsg.innerText = "❌ Lỗi khi đọc PDF. File có thể bị lỗi hoặc quá nặng.";
        }
    }
});

// =====================================================================
// LƯU DATA VÀO FIRESTORE
// =====================================================================
document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "⏳ Đang lưu..."; btnSubmit.disabled = true;

    try {
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
        pdfViewer.classList.add('hidden');
        modal.classList.add('hidden');
        await loadAndRenderMatrix();
    } catch (error) {
        alert("Lỗi khi lưu dữ liệu vào Firebase.");
    } finally {
        btnSubmit.innerText = "💾 LƯU VÀO VAULT"; btnSubmit.disabled = false;
    }
});

// =====================================================================
// AI CHATBOT (GEMINI 2.5 FLASH)
// =====================================================================
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const btnChatSend = document.getElementById('btn-chat-send');

async function sendChatMessage() {
    const userText = chatInput.value.trim();
    if (!userText) return;

    chatHistory.innerHTML += `<div class="chat-msg user-msg">${userText}</div>`;
    chatInput.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight; 

    const loadingId = "msg-" + Date.now();
    chatHistory.innerHTML += `<div id="${loadingId}" class="chat-msg ai-msg">⏳ Đang suy nghĩ...</div>`;
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const prompt = `
    Bạn là trợ lý học tập chuyên nghiệp. 
    Ngữ cảnh từ PDF: """${currentPdfText.substring(0, 30000)}"""
    
    Yêu cầu: "${userText}"
    (Dịch thuật hoặc giải thích ngắn gọn dựa trên tài liệu).
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Google từ chối: ${data.error?.message || "Lỗi không xác định"}`);
        }
        
        const aiText = data.candidates[0].content.parts[0].text;
        document.getElementById(loadingId).innerHTML = aiText.replace(/\n/g, '<br>');
        
    } catch (e) {
        document.getElementById(loadingId).innerHTML = `<b>❌ LỖI:</b> ${e.message}`;
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

btnChatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

// =====================================================================
// AI DISCOVERY (DÙNG 2.5 FLASH)
// =====================================================================
document.getElementById('btn-ai-search').addEventListener('click', async () => {
    const query = document.getElementById('topic-search').value.trim();
    if (!query) return;

    const btnSearch = document.getElementById('btn-ai-search');
    const resultsContainer = document.getElementById('search-results');
    
    btnSearch.innerText = "⏳ Đang tìm..."; btnSearch.disabled = true;
    resultsContainer.classList.add('hidden'); 
    resultsContainer.innerHTML = '';

    const prompt = `Đề xuất 3 báo cáo uy tín về: "${query}". Trả về JSON mảng: [{"title": "", "desc": "", "searchQuery": ""}]`;

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
        const resultsArray = JSON.parse(data.candidates[0].content.parts[0].text);

        resultsArray.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('result-card');
            card.innerHTML = `
                <h4>${item.title}</h4>
                <p>${item.desc}</p>
                <a href="https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}" target="_blank">🔗 Tìm bản gốc (PDF)</a>
            `;
            resultsContainer.appendChild(card);
        });
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        alert("Lỗi khi tìm kiếm ý tưởng.");
    } finally {
        btnSearch.innerText = "🔍 Tìm kiếm Báo cáo"; btnSearch.disabled = false;
    }
});
