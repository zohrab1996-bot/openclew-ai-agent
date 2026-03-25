import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
    API_KEY: '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew AI Executive Strategist v5.1",
    FONT_CACHE: path.resolve('./Roboto.ttf'),
    FONT_URL: 'https://raw.githubusercontent.com/googlefonts/roboto/main/src/v2/Roboto-Regular.ttf',
    PDF_PATH: path.resolve('./Strategic_Intelligence.pdf'),
    NEWS_COUNT: 4,
};

const NEWS_SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
];

const groq = new Groq({ apiKey: CONFIG.API_KEY });

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function log(icon, msg) {
    console.log(`${icon} [${new Date().toISOString()}] ${msg}`);
}

async function retry(fn, attempts = 3, delay = 1500) {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === attempts - 1) throw err;
            log('⏳', `Yenidən cəhd (${i + 1}/${attempts}): ${err.message}`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

// ─── RSS PARSER (xarici asılılıq yoxdur) ─────────────────────────────────────
function extractCdata(str) {
    if (!str) return '';
    return str.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').trim();
}

function parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;

    const blocks = [...(xml.matchAll(itemRegex) || []), ...(xml.matchAll(entryRegex) || [])];

    for (const block of blocks) {
        const content = block[1];

        // Title
        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const title = extractCdata(titleMatch?.[1] || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        // Link — RSS <link> vs Atom <link href="...">
        const linkHrefMatch = content.match(/<link[^>]+href=["']([^"']+)["']/);
        const linkTextMatch = content.match(/<link[^>]*>([\s\S]*?)<\/link>/);
        const link = linkHrefMatch?.[1] || extractCdata(linkTextMatch?.[1] || '') || '#';

        if (title && title.length > 3) {
            items.push({ title, link });
        }
    }

    return items.slice(0, CONFIG.NEWS_COUNT);
}

// ─── FONT ─────────────────────────────────────────────────────────────────────
async function ensureFont() {
    if (fs.existsSync(CONFIG.FONT_CACHE)) {
        log('✅', 'Font cache-dən götürüldü.');
        return CONFIG.FONT_CACHE;
    }
    try {
        log('⬇️', 'Font yüklənir...');
        const res = await axios.get(CONFIG.FONT_URL, { responseType: 'arraybuffer', timeout: 12000 });
        fs.writeFileSync(CONFIG.FONT_CACHE, res.data);
        log('✅', 'Font uğurla yükləndi.');
        return CONFIG.FONT_CACHE;
    } catch {
        log('⚠️', 'Font yüklənmədi, Helvetica istifadə edilir.');
        return null;
    }
}

// ─── NEWS FETCHER ─────────────────────────────────────────────────────────────
async function fetchFromSource(url) {
    const res = await axios.get(url, {
        timeout: 12000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenClewBot/1.0)' },
    });
    const items = parseRSS(res.data);
    if (items.length === 0) throw new Error('Bu mənbədən xəbər tapılmadı.');
    return items;
}

async function getIntelligence() {
    const shuffled = [...NEWS_SOURCES].sort(() => Math.random() - 0.5);
    for (const url of shuffled) {
        try {
            log('📡', `Mənbə yoxlanır: ${url}`);
            const items = await retry(() => fetchFromSource(url));
            log('✅', `${items.length} xəbər tapıldı: ${url}`);
            return items;
        } catch (err) {
            log('⚠️', `Mənbə uğursuz: ${url} → ${err.message}`);
        }
    }
    throw new Error('Heç bir xəbər mənbəyindən məlumat alınmadı.');
}

// ─── ANALYZER ─────────────────────────────────────────────────────────────────
async function analyze(news) {
    const prompt = `Sən Azərbaycanın rəqəmsal transformasiya üzrə ən yüksək səviyyəli strateqisən.
Xəbər: "${news.title}"

Aşağıdakı strukturda cavab ver:
1. ANALİZ: Bu texnologiya qlobal bazarda nəyi dəyişir? (2-3 cümlə, konkret)
2. AZƏRBAYCAN PERSPEKTİVİ: Ölkəmizdə rəqəmsal xidmətlər və ya innovasiya mərkəzləri üçün bu nə deməkdir?
3. STRATEJİ TÖVSİYƏ: Nazirlik və ya rəhbər şəxslər üçün 1 cümləlik konkret qərar təklifi.

Dil: Müasir Azərbaycan işgüzar dili. "ə, ö, ğ, ç, ş, ı, İ" hərflərindən qüsursuz istifadə et.`;

    const response = await retry(() =>
        groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 600,
        })
    );
    return response.choices[0].message.content.trim();
}

async function analyzeAll(newsList) {
    const results = [];
    for (const [i, n] of newsList.entries()) {
        log('🧠', `Analiz edilir (${i + 1}/${newsList.length}): ${n.title}`);
        const analysis = await retry(() => analyze(n));
        results.push({ ...n, analysis });
        if (i < newsList.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    return results;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
async function createPDF(data, fontPath) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);
        stream.on('error', reject);

        const useFont = (bold = false) => {
            if (fontPath) {
                try { doc.font(fontPath); return; } catch {}
            }
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
        };

        // Header
        doc.rect(0, 0, 612, 90).fill('#001F4E');
        doc.fillColor('#FFFFFF');
        useFont(true);
        doc.fontSize(20).text('STRATEJİ İNSAYT HESABATI', 50, 28);
        doc.fontSize(9).text(
            `Tarix: ${new Date().toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })}   |   ${CONFIG.IDENTITY}`,
            50, 60
        );

        doc.moveDown(4.5);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#C8A84B').lineWidth(1.5).stroke();
        doc.moveDown(1.5);

        // Items
        data.forEach((item, i) => {
            if (doc.y > 700) doc.addPage();

            useFont(true);
            doc.fillColor('#001F4E').fontSize(13).text(`${i + 1}. ${item.title}`, { lineGap: 2 });

            doc.fontSize(8).fillColor('#888888');
            useFont(false);
            doc.text(`Mənbə: ${item.link}`, { underline: true, lineGap: 2 });

            doc.moveDown(0.6);
            doc.fillColor('#1A1A1A').fontSize(10.5);
            useFont(false);
            doc.text(item.analysis, { align: 'justify', lineGap: 5 });

            doc.moveDown(1.8);
            doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#E0E0E0').lineWidth(0.5).stroke();
            doc.moveDown(1.5);
        });

        // Footer
        doc.rect(0, 812, 612, 30).fill('#001F4E');
        doc.fillColor('#AAAAAA').fontSize(7.5);
        useFont(false);
        doc.text('MDDT — Rəqəmsal Transformasiya Hesabatı  |  Gizli sənəd', 50, 818, { align: 'center', width: 512 });

        doc.end();
        stream.on('finish', () => {
            log('📄', `PDF yaradıldı: ${CONFIG.PDF_PATH}`);
            resolve(CONFIG.PDF_PATH);
        });
    });
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────
async function sendEmail(pdfPath, itemCount) {
    if (!CONFIG.EMAIL_PASS) throw new Error('EMAIL_PASS mühit dəyişəni təyin edilməyib.');

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS },
    });

    const dateStr = new Date().toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' });

    await retry(() => transporter.sendMail({
        from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
        to: CONFIG.RECIPIENT,
        subject: `💼 STRATEJİ ANALİZ — ${dateStr}`,
        html: `
            <p>Hörmətli Zöhrab bəy,</p>
            <p>Bu günün <strong>${itemCount} ən vacib AI xəbərinin</strong> strateji analizi əlavə edilmiş PDF-də təqdim olunur.</p>
            <p>Hörmətlə,<br/><em>${CONFIG.IDENTITY}</em></p>
        `,
        attachments: [{ filename: `Intelligence_Report_${Date.now()}.pdf`, path: pdfPath }],
    }));

    log('📧', 'Email uğurla göndərildi.');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    log('🚀', 'Senior Agent Mission Started...');
    let pdfPath = null;

    try {
        const font    = await ensureFont();
        const news    = await getIntelligence();
        const results = await analyzeAll(news);
        pdfPath = await createPDF(results, font);
        await sendEmail(pdfPath, results.length);
        log('🏁', 'Mission Successful.');
    } catch (err) {
        log('❌', `CRITICAL ERROR: ${err.message}`);

        if (CONFIG.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: CONFIG.RECIPIENT, pass: CONFIG.EMAIL_PASS },
                });
                await transporter.sendMail({
                    from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
                    to: CONFIG.RECIPIENT,
                    subject: '🚨 Agent Xəta Bildirişi',
                    text: `Agent xəta ilə dayandı:\n\n${err.stack || err.message}`,
                });
                log('📧', 'Xəta bildirişi göndərildi.');
            } catch (mailErr) {
                log('⚠️', `Xəta emaili göndərilmədi: ${mailErr.message}`);
            }
        }

        process.exit(1);
    } finally {
        if (pdfPath && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            log('🗑️', 'Müvəqqəti PDF silindi.');
        }
    }
}

main();
