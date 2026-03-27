import axios from 'axios';
import Groq from 'groq-sdk';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';

/**
 * --- [ARCHITECTURE CONFIG v9.0] ---
 * Təkmilləşdirilmiş konfiqurasiya: Təhlükəsizlik və dayanıqlıq üçün
 */
const CONFIG = {
    // Təhlükəsizlik üçün API açarlarını mütləq Environment Variable olaraq saxlayın!
    GROQ_API_KEY: process.env.GROQ_API_KEY || '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',
    RECIPIENT: 'zohrab.rza@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS,
    IDENTITY: "OpenClew Global Intelligence v9.0 (Optimized)",
    PDF_PATH: path.resolve('./Strategic_Intelligence_Report.pdf'),
    MODEL: 'llama-3.3-70b-versatile',
    TIMEOUT: 15000,
    MAX_NEWS_PER_SOURCE: 2,
    TOTAL_SOURCES_TO_USE: 3
};

const groq = new Groq({ apiKey: CONFIG.GROQ_API_KEY });
const parser = new Parser();

const SOURCES = [
    'https://openai.com/news/rss.xml',
    'https://deepmind.google/blog/rss.xml',
    'https://www.technologyreview.com/feed/',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://hai.stanford.edu/news/rss.xml',
    'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml'
];

/**
 * --- [CORE ENGINE: NEWS AGGREGATOR] ---
 * rss-parser istifadə edərək daha etibarlı xəbər çəkmə sistemi
 */
async function getNews() {
    console.log("📡 Connecting to global AI streams via RSS Parser...");
    const selectedSources = SOURCES.sort(() => 0.5 - Math.random()).slice(0, CONFIG.TOTAL_SOURCES_TO_USE);
    let allItems = [];

    const sourcePromises = selectedSources.map(async (url) => {
        try {
            const feed = await parser.parseURL(url);
            return feed.items.slice(0, CONFIG.MAX_NEWS_PER_SOURCE).map(item => ({
                title: item.title,
                link: item.link,
                content: item.contentSnippet || item.content || ""
            }));
        } catch (e) {
            console.error(`⚠️ Source failed: ${url} - ${e.message}`);
            return [];
        }
    });

    const results = await Promise.all(sourcePromises);
    allItems = results.flat();

    if (allItems.length === 0) throw new Error("No news found in any sources. Check your internet or RSS URLs.");
    console.log(`✅ Collected ${allItems.length} news items for analysis.`);
    return allItems;
}

/**
 * --- [CORE ENGINE: AI STRATEGIST] ---
 * Daha dərin və strukturlaşdırılmış analiz üçün Prompt Engineering
 */
async function deepAnalyze(news) {
    console.log(`🧠 Synthesizing Strategy: ${news.title.substring(0, 50)}...`);
    
    const prompt = `
    Role: Senior Global AI Strategy Advisor (OpenClew Intelligence)
    Task: Deep strategic analysis of the following news.
    
    News Title: "${news.title}"
    Context: "${news.content.substring(0, 500)}"
    
    Requirements for the Report:
    1. GLOBAL CONTEXT: Explain the macro-economic and technological significance of this event.
    2. INDUSTRY VERTICALS: Specifically analyze the impact on Logistics, Energy, and Government sectors in emerging markets (like Azerbaijan).
    3. STRATEGIC IMPERATIVE: Provide 3 concrete, actionable recommendations for executive leadership.
    4. RISK & ETHICS: Identify potential security, privacy, or ethical risks.
    5. FUTURE OUTLOOK: A 12-month prediction based on this trend.

    Language: English. Style: Professional, analytical, and authoritative. 
    Use clear headings and bullet points.
    `;

    try {
        const res = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: "You are the core engine of OpenClew Intelligence. Your analysis must be deep, data-driven, and strategic." },
                { role: 'user', content: prompt }
            ],
            model: CONFIG.MODEL,
            temperature: 0.3, // Daha stabil və professional cavablar üçün
            max_tokens: 1500
        });
        return res.choices[0].message.content;
    } catch (e) {
        console.error(`❌ AI Analysis failed for: ${news.title}`);
        return "Analysis unavailable due to technical error in the AI engine.";
    }
}

/**
 * --- [CORE ENGINE: PDF GENERATOR] ---
 * Daha professional dizayn və Unicode dəstəyi üçün hazırlıq
 */
async function createFinalPDF(results) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            margin: 50, 
            size: 'A4',
            info: {
                Title: 'Strategic Intelligence Report',
                Author: 'OpenClew AI Agent',
            }
        });
        
        const stream = fs.createWriteStream(CONFIG.PDF_PATH);
        doc.pipe(stream);

        // --- COVER PAGE ---
        doc.rect(0, 0, 612, 842).fill('#F4F7F9'); // Light background
        doc.rect(0, 0, 612, 250).fill('#001F3F'); // Dark header
        
        doc.fillColor('#FFFFFF').fontSize(32).font('Helvetica-Bold').text('STRATEGIC BRIEF', 50, 80);
        doc.fontSize(14).font('Helvetica').fillColor('#3A9AD9').text('AI GLOBAL INTELLIGENCE & INDUSTRY IMPACT', 50, 125);
        
        doc.moveDown(2);
        doc.fontSize(10).fillColor('#FFFFFF').text(`System ID: ${CONFIG.IDENTITY}`, 50, 180);
        doc.text(`Generated on: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`, 50, 195);
        
        doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text('EXECUTIVE SUMMARY', 50, 300);
        doc.fontSize(11).font('Helvetica').text(
            `This report provides a deep-dive analysis of ${results.length} critical AI developments. 
            Each section is designed to provide actionable intelligence for decision-makers 
            navigating the rapidly evolving technological landscape.`, 
            50, 325, { width: 500, align: 'justify' }
        );

        // --- CONTENT PAGES ---
        results.forEach((n, i) => {
            doc.addPage();
            
            // Header for each page
            doc.rect(0, 0, 612, 40).fill('#001F3F');
            doc.fillColor('#FFFFFF').fontSize(10).text(`OpenClew Strategic Report | Case #${i + 1}`, 50, 15);
            
            doc.moveDown(4);
            doc.fillColor('#001F3F').fontSize(20).font('Helvetica-Bold').text(`${i + 1}. ${n.title}`, { width: 500 });
            
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#1890FF').font('Helvetica').text(`SOURCE LINK: ${n.link}`, { underline: true, link: n.link });
            
            doc.moveDown(1);
            doc.rect(50, doc.y, 2, 20).fill('#1890FF'); // Blue accent line
            doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold').text('   Analysis & Strategic Insight', 55, doc.y - 15);
            
            doc.moveDown(1);
            doc.fillColor('#444444').fontSize(10.5).font('Helvetica').text(n.analysis, {
                align: 'justify',
                lineGap: 3,
                paragraphGap: 10
            });

            // Footer
            doc.fontSize(8).fillColor('#AAAAAA').text(`Confidential | OpenClew AI | Page ${doc.bufferedPageRange().count}`, 50, 785, { align: 'center' });
        });

        doc.end();

        stream.on('finish', () => {
            console.log(`✅ Professional PDF Generated: ${CONFIG.PDF_PATH}`);
            resolve(CONFIG.PDF_PATH);
        });
        stream.on('error', reject);
    });
}

/**
 * --- [ORCHESTRATOR] ---
 */
async function startCycle() {
    console.log("🚀 INITIALIZING OPEN-CLEW INTELLIGENCE CYCLE...");
    const startTime = Date.now();

    try {
        // 1. Fetch News
        const news = await getNews();
        
        // 2. Parallel Analysis (Sürətli icra üçün Promise.all istifadə edirik)
        console.log("🧠 Starting parallel AI analysis...");
        const analysisPromises = news.map(async (n) => {
            const analysis = await deepAnalyze(n);
            return { ...n, analysis };
        });
        
        const fullData = await Promise.all(analysisPromises);

        // 3. Generate PDF
        const reportPath = await createFinalPDF(fullData);

        // 4. Send Email
        console.log("📧 Preparing to dispatch intelligence via email...");
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: CONFIG.RECIPIENT, 
                pass: CONFIG.EMAIL_PASS 
            }
        });

        const info = await transporter.sendMail({
            from: `"OpenClew Strategist" <${CONFIG.RECIPIENT}>`,
            to: CONFIG.RECIPIENT,
            subject: `🚨 STRATEGIC INTELLIGENCE: ${new Date().toLocaleDateString('en-US')} Report`,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #001F3F;">OpenClew Strategic Report</h2>
                    <p>Zöhrab bəy, salam.</p>
                    <p>Süni İntellekt əsaslı gündəlik strateji analiziniz hazırdır. Bu hesabatda <b>${fullData.length} fərqli texnoloji trend</b> dərindən təhlil edilmişdir.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">Bu hesabat avtomatlaşdırılmış OpenClew AI Agent tərəfindən hazırlanmışdır.</p>
                </div>
            `,
            attachments: [{ filename: `OpenClew_Report_${new Date().toISOString().split('T')[0]}.pdf`, path: reportPath }]
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`🏁 MISSION ACCOMPLISHED in ${duration}s. Message ID: ${info.messageId}`);
        
    } catch (err) {
        console.error(`❌ MISSION CRITICAL FAILURE: ${err.message}`);
        process.exit(1);
    }
}

// Start the engine
startCycle();
