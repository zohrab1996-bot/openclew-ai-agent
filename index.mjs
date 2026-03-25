import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [1. KONFİQURASİYA] ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const EMAIL_CONFIG = {
    user: 'zohrab.rza@gmail.com',
    pass: process.env.EMAIL_PASS,
    to: 'zohrab.rza@gmail.com'
};

// --- [2. SKANER: 12 Qlobal Elmi Mənbə] ---
async function fetchReports() {
    const sources = [
        { name: 'arXiv AI', url: 'https://rss.arxiv.org/rss/cs.AI' },
        { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
        { name: 'DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
        { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml' },
        { name: 'WEF Innovation', url: 'https://www.weforum.org/agenda/feed' },
        { name: 'NASA AI', url: 'https://www.nasa.gov/news-release/feed/' },
        { name: 'Stanford HAI', url: 'https://hai.stanford.edu/news/rss.xml' },
        { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/robotics/fulltext' },
        { name: 'Wired AI', url: 'https://www.wired.com/feed/category/gear/latest/rss' },
        { name: 'The Verge', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
        { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
        { name: 'Google AI', url: 'http://feeds.feedburner.com/blogspot/gmfb' }
    ];
    
    let reports = [];
    console.log("🌐 Mənbələr skan edilir...");
    for (const source of sources) {
        try {
            const res = await axios.get(source.url, { timeout: 10000 });
            const items = res.data.split('<item>').slice(1, 3); // Hər mənbədən 2 xəbər
            for (const item of items) {
                const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
                const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];
                if (title && link) {
                    reports.push({ title: title.trim(), url: link.trim(), source: source.name });
                }
            }
        } catch (e) { console.log(`⚠️ ${source.name} xətası.`); }
    }
    return reports.slice(0, 10);
}

// --- [3. ANALİZ: Akademik Azərbaycan Dili Modulu] ---
async function analyzeReports(reports) {
    const summaries = [];
    for (const report of reports) {
        try {
            const res = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycan Respublikasının Rəqəmsal Strateqisən. Dilin rəsmi, akademik və dövlət əhəmiyyətli sənəd üslubundadır. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.' },
                    { role: 'user', content: `Texnoloji hadisəni analiz et: "${report.title}". Tələblər: [KONSEPTUAL ANALİZ], [MİLLİ ADAPTASİYA (MyGov, Rəqəmsal Suverenlik)], [STRATEJİ TÖVSİYƏ].` }
                ]
            });
            summaries.push({ ...report, summary: res.choices[0].message.content });
            console.log(`✅ Analiz edildi: ${report.title.substring(0, 40)}...`);
        } catch (err) { console.log("⚠️ Analiz xətası."); }
    }
    return summaries;
}

// --- [4. PDF GENERASİYA] ---
async function createPDF(summaries) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50 });
        const path = 'OpenClew_Strategic_Report.pdf';
        const stream = fs.createWriteStream(path);
        doc.pipe(stream);
        
        doc.fontSize(25).fillColor('#1a237e').text('OpenClew Strateji Hesabat', { align: 'center' });
        doc.fontSize(10).fillColor('gray').text(`Tarix: ${new Date().toLocaleString('az-AZ')}`, { align: 'center' });
        doc.moveDown(2);
        
        summaries.forEach(s => {
            doc.fontSize(14).fillColor('#0d47a1').text(s.title, { link: s.url, underline: true });
            doc.fontSize(9).fillColor('gray').text(`Mənbə: ${s.source}`);
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('black').text(s.summary, { align: 'justify' });
            doc.moveDown(1.5);
        });
        
        doc.end();
        stream.on('finish', () => resolve(path));
    });
}

// --- [5. EMAİL GÖNDƏRİLMƏSİ] ---
async function sendEmail(pdfPath) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass }
    });

    await transporter.sendMail({
        from: `OpenClew AI <${EMAIL_CONFIG.user}>`,
        to: EMAIL_CONFIG.to,
        subject: `🚀 Strateji Hesabat: ${new Date().toLocaleDateString('az-AZ')}`,
        text: 'Zöhrab bəy, günün texnoloji analizi PDF formatında əlavə olunub.',
        attachments: [{ filename: 'OpenClew_Report.pdf', path: pdfPath }]
    });
}

// --- [MİSSİYA İCRAÇISI] ---
async function startMission() {
    console.log("🚀 Missiya başladı...");
    try {
        const rawData = await fetchReports();
        if (rawData.length === 0) throw new Error("Məlumat tapılmadı.");
        
        const analyzedData = await analyzeReports(rawData);
        const pdfFile = await createPDF(analyzedData);
        await sendEmail(pdfFile);
        
        console.log("🏁 MİSSİYA UĞURLA TAMAMLANDI!");
    } catch (error) {
        console.error("❌ XƏTA BAŞ VERDİ:", error.message);
    }
}

startMission();
