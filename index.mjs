import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- [KONFİQURASİYA] ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const EMAIL_CONFIG = {
    user: 'zohrab.rza@gmail.com', // Sənin Gmail ünvanın
    pass: process.env.EMAIL_PASS, // GitHub Secrets-dəki App Password
    to: 'zohrab.rza@gmail.com'
};

// --- [FUNKSİYA 1: 12 Qlobal Mənbə Skaneri] ---
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
        { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
        { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
        { name: 'Google AI Blog', url: 'http://feeds.feedburner.com/blogspot/gmfb' }
    ];
    
    let reports = [];
    console.log("🌐 12 Qlobal mənbə skan edilir...");
    for (const source of sources) {
        try {
            const res = await axios.get(source.url, { timeout: 10000 });
            const items = res.data.split('<item>').slice(1, 4);
            for (const item of items) {
                const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/) || [])[1];
                const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/link>/) || [])[1];
                if (title && link) reports.push({ title: title.trim(), url: link.trim(), source: source.name });
            }
        } catch (e) { console.log(`⚠️ ${source.name} xətası.`); }
    }
    return reports.slice(0, 10); // Ən vacib 10 xəbər
}

// --- [FUNKSİYA 2: Akademik Analiz & Fakt Yoxlama] ---
async function analyzeReports(reports) {
    const summaries = [];
    for (const report of reports) {
        try {
            const res = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Sən Azərbaycanın Rəqəmsal Strateqisən. Dilin rəsmi, akademik və dövlət əhəmiyyətli sənəd üslubundadır. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.' },
                    { role: 'user', content: `Texnoloji hadisəni analiz et: "${report.title}". Tələblər: [KONSEPTUAL ANALİZ], [MİLLİ ADAPTASİYA (MyGov, Rəqəmsal Suverenlik)], [STRATEJİ TÖVSİYƏ].` }
                ]
            });
            summaries.push({ ...report, summary: res.choices[0].message.content });
            console.log(`✅ Analiz tamamlandı: ${report.title.substring(0, 30)}`);
        } catch (err) { console.log("⚠️ Analiz xətası."); }
    }
    return summaries;
}

// --- [FUNKSİYA 3: PDF Hazırlanması] ---
async function createPDF(summaries) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50 });
        const path = 'OpenClew_Report.pdf';
        const stream = fs.createWriteStream(path);
        doc.pipe(stream);
        doc.fontSize(25).fillColor('#1a237e').text('OpenClew Strateji Hesabat', { align: 'center' });
        doc.fontSize(10).fillColor('gray').text(`Tarix: ${new Date().toLocaleDateString('az-AZ')}`, { align: 'center' });
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

// --- [FUNKSİYA 4: Email Göndərilməsi] ---
async function sendEmail(pdfPath) {
    let transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass } });
    await transporter.sendMail({
        from: `OpenClew AI <${EMAIL_CONFIG.user}>`,
        to: EMAIL_CONFIG.to,
        subject: `🚀 OpenClew Strateji Hesabat - ${new Date().toLocaleDateString('az-AZ')}`,
        text: 'Zöhrab bəy, günün rəqəmsal analizi əlavədədir. Bu hesabat GitHub Bulud serverləri tərəfindən hazırlanmışdır.',
        attachments: [{ filename: 'OpenClew_Report.pdf', path: pdfPath }]
    });
}

// --- [ANA İCRA MƏNTİQİ] ---
async function main() {
    console.log("🚀 OpenClew Bulud Missiyası Başladı...");
    try {
        const reports = await fetchReports();
        if (reports.length === 0) return console.log("📭 Yeni məlumat tapılmadı.");
        const summaries = await analyzeReports(reports);
        const pdfPath = await createPDF(summaries);
        await sendEmail(pdfPath);
        console.log("🏁 MİSSİYA TAMAMLANDI: Hesabat göndərildi!");
    } catch (err) {
        console.error("❌ Kritik xəta:", err);
    }
}

main();
