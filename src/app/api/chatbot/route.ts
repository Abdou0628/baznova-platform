import { NextRequest, NextResponse } from 'next/server'
import { withAuth, secureAIInput, validateAIOutput, checkAIAbuseLimit, logAIEvent } from '@/lib/hnsa'

type Lang = 'fr' | 'en' | 'ar' | 'es'
type Mode = 'advisor' | 'support' | 'products'

// ─── Language Detection ───────────────────────────────────────────────────
function detectLanguage(message: string): Lang {
  const trimmed = message.trim()
  // Arabic: detect Arabic script range
  if (/[\u0600-\u06FF]/.test(trimmed)) return 'ar'

  // Count-based detection for EN vs ES vs FR
  const enMatches = (trimmed.match(/\b(how|what|where|when|why|can|could|would|should|please|work|function|feature|advisor|search|career|hello|hi|thanks|information|description|characteristics|country|countries|does|is|are|the|to|for|with|from|about|your|my|this|that|want|need|know|tell|give|find|get|make|use|have|best|good|great|much|many|more|also|very|just|like|will)\b/gi) || []).length
  const esMatches = (trimmed.match(/\b(cómo|cual|cuándo|dónde|por qué|qué|también|puedo|puedes|puede|ayuda|soporte|precios|funciona|producto|consejero|buscar|trabajo|empleo|hola|gracias|información|descripción|características|gratis|país|países|generador|entrevista|formación|mercado|perfil|optimizar|entrenamiento|necesito|quiero|saber|dime|busco|pregunto|cuesta|cuánto|los|las|una|unos|unas|está|están|tiene|tienen|pueden|ser|pero|porque|aunque|mientras|cuando|donde|como|mas|mucho|muchos|todas|todos)\b/gi) || []).length
  const frMatches = (trimmed.match(/\b(comment|pourquoi|quelle|quel|quels|quelles|où|aussi|peux|pouvez|peut|aide|support|prix|fonctionne|produit|conseiller|chercher|travail|emploi|bonjour|merci|information|description|caractéristiques|gratuit|pays|générateur|entretien|formation|profil|optimiser|recruteur|recherche|candidature|postuler|offre|entreprise|expérience|compétence|diplôme|études|parcours|carrière|salariel|négocier|préparer|améliorer|créer|générer|analyser|score|compatibilité|système|plateforme|outil|service|abonnement|forfait|renouveler|annuler|facturer|paiement|facture|facturation)\b/gi) || []).length

  if (enMatches > esMatches && enMatches > frMatches) return 'en'
  if (esMatches > frMatches) return 'es'
  if (frMatches > 0) return 'fr'
  // Default: French
  return 'fr'
}

// ─── Products Knowledge Base — ALL 13 Modules in 4 Languages ──────────────
const KB_PRODUCTS: Record<Lang, string> = {
  fr: `
MODULES DE L'ÉCOSYSTÈME HIRENOVA (13 modules):

1. **HireNova IA CV** (Émeraude)
   - Génération de CV professionnels par IA en 60 secondes
   - 4 langues: Français, Anglais, Arabe, Espagnol
   - 3 templates: Moderne, Classique, Créatif
   - 6 personas: Étudiant, Diplômé, Professionnel, Cadre, Freelance, Expatrié
   - Export PDF + Word, sans watermark (plan Pro)
   - Accès: carte "HireNova IA CV" dans l'écosystème → formulaire CV

2. **HireNova IA ATS** (Émeraude)
   - Score de compatibilité ATS (Applicant Tracking System) sur 100
   - 4 catégories analysées: Mots-clés/SEO, Structure/Format, Impact de l'expérience, Complétude
   - Suggestions d'amélioration personnalisées
   - Le score ATS est calculé APRÈS génération du CV (étape Preview)
   - Accès: carte "HireNova IA ATS" → créez d'abord un CV, puis lancez l'analyse ATS depuis la page Preview

3. **HireNova IA Jobs** (Émeraude)
   - Marketplace d'offres d'emploi locales (Maroc et international)
   - Publiez des offres (employeur) ou postulez (candidat)
   - Dashboard employeur avec statistiques
   - Suivi des candidatures par le candidat
   - Accès: carte "HireNova IA Jobs" → marketplace des offres

4. **HireNova IA Global** (Teal)
   - 40+ pays couverts sur 5 régions: Europe, Asie, Afrique, Amériques, MENA
   - Filtres avancés: région, pays, mot-clé
   - Badges Visa Sponsorship + Relocation Package + Remote
   - Dashboard employeur global avec stats par région
   - Publication d'offres internationales
   - Candidature internationale avec matching IA candidat/offre
   - Accès: carte "HireNova IA Global" → marketplace international
   - Régions: Europe (FR, UK, DE, CH, BE, ES, IT), Amériques (US, CA), Asie (JP, SG, AE), MENA (MA, EG, SA, QA), Afrique (MA, ZA, NG, KE)

5. **HireNova IA MOBILITY** (Violet)
   - Pipeline OCR + NLP en 4 étapes:
     * Étape 1: Upload CV (PDF/Image) → extraction OCR du texte brut
     * Étape 2: Analyse IA (LLM + NLP) → profil structuré (skills, expérience, éducation)
     * Étape 3: Reformulation automatique CV + lettre de motivation selon les standards du pays cible
     * Étape 4: Calcul du score de compatibilité + détection des skills gap
   - 12 pays supportés: France, UK, USA, Canada, Allemagne, UAE, Suisse, Belgique, Espagne, Italie, Japon, Australie
   - Accès: carte "HireNova IA MOBILITY" → page d'accueil Mobilité

6. **HireNova IA API** (Sky)
   - Portail développeur REST
   - 4 endpoints: POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage
   - 3 plans: Starter (gratuit, 100 req/mois), Pro (29€/mois, 5000 req/mois), Enterprise (sur devis)
   - Clé API + dashboard de suivi de consommation
   - Accès: carte "HireNova IA API" → documentation API

7. **HireNova IA LinkedIn** (Bleu LinkedIn)
   - Optimiseur de profil LinkedIn par IA
   - Analyse et amélioration: headline, summary, expérience, compétences
   - Suggestions de mots-clés pour la visibilité recruteurs
   - Optimisation SEO LinkedIn
   - Accès: carte "HireNova IA LinkedIn" → formulaire d'optimisation profil

8. **HireNova IA Recruiter** (Orange)
   - Matching IA candidat/offre d'emploi
   - Algorithme de compatibilité multi-critères
   - Suggestion de candidats pour les recruteurs
   - Suggestion d'offres pour les candidats
   - Dashboard recruteur avec pipelines de recrutement
   - Accès: carte "HireNova IA Recruiter" → tableau de matching

9. **HireNova IA Career** (Rose)
   - Feuille de route de carrière personnalisée (Career Roadmap)
   - Analyse des compétences actuelles vs compétences cibles
   - Plan d'apprentissage sur mesure
   - Jalons de carrière avec timelines
   - Recommandations de formations et certifications
   - Accès: carte "HireNova IA Career" → page roadmap

10. **HireNova IA Coach** (Amber)
    - Coach IA de carrière interactif
    - Préparation aux entretiens d'embauche (mock interviews)
    - Retour détaillé sur les réponses
    - Conseils de négociation salariale
    - Planification de développement professionnel
    - Accès: carte "HireNova IA Coach" → session de coaching

11. **HireNova IA Formation** (Indigo)
    - Plateforme de formation et développement de compétences
    - Parcours d'apprentissage personnalisés
    - Contenu: vidéo, articles, quiz interactifs
    - Certifications HireNova
    - Suivi de progression
    - Accès: carte "HireNova IA Formation" → catalogue de formations

12. **HireNova IA Freelance** (Violet)
    - Marketplace freelance intégrée
    - Mise en relation freelances/clients
    - Portefeuille de projets
    - Système de paiements sécurisés
    - Évaluations et avis
    - Accès: carte "HireNova IA Freelance" → marketplace freelance

13. **HireNova IA Interview** (Teal)
    - Simulation d'entretiens d'embauche par IA
    - Questions adaptées au poste et au secteur
    - Évaluation en temps réel des réponses
    - Rapport détaillé post-entretien
    - Préparation technique et comportementale
    - Accès: carte "HireNova IA Interview" → simulateur d'entretien

TARIFICATION HIRENOVA:
- Gratuit: 3 CV/mois, watermark, fonctionnalités limitées
- Pro (6.99€/mois): CV illimités, lettres, score ATS, export PDF+Word, sans watermark
- Annuel (70€/an): Tout Pro + priorité support
- Lifetime: paiement unique, accès permanent

TARIFICATION API:
- Starter: gratuit, 100 requêtes/mois
- Pro: 29€/mois, 5000 requêtes/mois
- Enterprise: sur devis`,

  en: `
HIRENOVA ECOSYSTEM MODULES (13 modules):

1. **HireNova IA CV** (Emerald)
   - AI-powered professional CV generation in 60 seconds
   - 4 languages: French, English, Arabic, Spanish
   - 3 templates: Modern, Classic, Creative
   - 6 personas: Student, Graduate, Professional, Executive, Freelancer, Expat
   - PDF + Word export, no watermark (Pro plan)
   - Access: "HireNova IA CV" card in the ecosystem → CV form

2. **HireNova IA ATS** (Emerald)
   - ATS (Applicant Tracking System) compatibility score out of 100
   - 4 categories analyzed: Keywords/SEO, Structure/Format, Experience Impact, Completeness
   - Personalized improvement suggestions
   - ATS score calculated AFTER CV generation (Preview step)
   - Access: "HireNova IA ATS" card → create a CV first, then launch ATS analysis from Preview page

3. **HireNova IA Jobs** (Emerald)
   - Local job marketplace (Morocco and international)
   - Post jobs (employer) or apply (candidate)
   - Employer dashboard with statistics
   - Application tracking for candidates
   - Access: "HireNova IA Jobs" card → job marketplace

4. **HireNova IA Global** (Teal)
   - 40+ countries across 5 regions: Europe, Asia, Africa, Americas, MENA
   - Advanced filters: region, country, keyword
   - Badges: Visa Sponsorship + Relocation Package + Remote
   - Global employer dashboard with per-region stats
   - International job posting
   - AI matching between candidate profile and job offer
   - Access: "HireNova IA Global" card → international marketplace
   - Regions: Europe (FR, UK, DE, CH, BE, ES, IT), Americas (US, CA), Asia (JP, SG, AE), MENA (MA, EG, SA, QA), Africa (MA, ZA, NG, KE)

5. **HireNova IA MOBILITY** (Violet)
   - OCR + NLP Pipeline in 4 steps:
     * Step 1: Upload CV (PDF/Image) → OCR text extraction
     * Step 2: AI Analysis (LLM + NLP) → structured profile (skills, experience, education)
     * Step 3: Automatic CV + cover letter reformulation per target country standards
     * Step 4: Compatibility score calculation + skills gap detection
   - 12 supported countries: France, UK, USA, Canada, Germany, UAE, Switzerland, Belgium, Spain, Italy, Japan, Australia
   - Access: "HireNova IA MOBILITY" card → Mobility home page

6. **HireNova IA API** (Sky)
   - REST developer portal
   - 4 endpoints: POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage
   - 3 plans: Starter (free, 100 req/month), Pro (€29/month, 5000 req/month), Enterprise (custom pricing)
   - API key + consumption tracking dashboard
   - Access: "HireNova IA API" card → API documentation

7. **HireNova IA LinkedIn** (LinkedIn Blue)
   - AI-powered LinkedIn profile optimizer
   - Analysis and improvement: headline, summary, experience, skills
   - Keyword suggestions for recruiter visibility
   - LinkedIn SEO optimization
   - Access: "HireNova IA LinkedIn" card → profile optimization form

8. **HireNova IA Recruiter** (Orange)
   - AI candidate/job matching
   - Multi-criteria compatibility algorithm
   - Candidate suggestions for recruiters
   - Job suggestions for candidates
   - Recruiter dashboard with recruitment pipelines
   - Access: "HireNova IA Recruiter" card → matching dashboard

9. **HireNova IA Career** (Pink)
   - Personalized career roadmap
   - Analysis of current skills vs. target skills
   - Custom learning plan
   - Career milestones with timelines
   - Training and certification recommendations
   - Access: "HireNova IA Career" card → roadmap page

10. **HireNova IA Coach** (Amber)
    - Interactive AI career coach
    - Interview preparation (mock interviews)
    - Detailed feedback on answers
    - Salary negotiation advice
    - Professional development planning
    - Access: "HireNova IA Coach" card → coaching session

11. **HireNova IA Formation** (Indigo)
    - Training and skill development platform
    - Personalized learning paths
    - Content: video, articles, interactive quizzes
    - HireNova certifications
    - Progress tracking
    - Access: "HireNova IA Formation" card → training catalog

12. **HireNova IA Freelance** (Violet)
    - Integrated freelance marketplace
    - Freelancer/client matching
    - Project portfolio
    - Secure payment system
    - Ratings and reviews
    - Access: "HireNova IA Freelance" card → freelance marketplace

13. **HireNova IA Interview** (Teal)
    - AI-powered job interview simulation
    - Questions tailored to the position and industry
    - Real-time answer evaluation
    - Detailed post-interview report
    - Technical and behavioral preparation
    - Access: "HireNova IA Interview" card → interview simulator

HIRENOVA PRICING:
- Free: 3 CVs/month, watermark, limited features
- Pro (€6.99/month): Unlimited CVs, cover letters, ATS score, PDF+Word export, no watermark
- Annual (€70/year): Everything in Pro + priority support
- Lifetime: One-time payment, permanent access

API PRICING:
- Starter: Free, 100 requests/month
- Pro: €29/month, 5000 requests/month
- Enterprise: Custom pricing`,

  ar: `
وحدات منظومة HireNova (13 وحدة):

1. **HireNova IA CV** (أخضر زمردي)
   - إنشاء سير ذاتية احترافية بالذكاء الاصطناعي في 60 ثانية
   - 4 لغات: الفرنسية، الإنجليزية، العربية، الإسبانية
   - 3 قوالب: عصري، كلاسيكي، إبداعي
   - 6 شخصيات: طالب، خريج، محترف، مدير تنفيذي، مستقل، مغترب
   - تصدير PDF + Word، بدون علامة مائية (خطة Pro)
   - الوصول: بطاقة "HireNova IA CV" في المنظومة → نموذج السيرة الذاتية

2. **HireNova IA ATS** (أخضر زمردي)
   - درجة توافق نظام تتبع المتقدمين (ATS) من 100
   - 4 فئات محللة: الكلمات المفتاحية/SEO، الهيكل/التنسيق، تأثير الخبرة، الاكتمال
   - اقتراحات تحسين مخصصة
   - تُحسب درجة ATS بعد إنشاء السيرة الذاتية (خطوة المعاينة)
   - الوصول: بطاقة "HireNova IA ATS" → أنشئ سيرة ذاتية أولاً، ثم شغّل تحليل ATS من صفحة المعاينة

3. **HireNova IA Jobs** (أخضر زمردي)
   - سوق عروض العمل المحلية (المغرب ودولياً)
   - انشر عروض عمل (صاحب عمل) أو تقدم (مرشح)
   - لوحة تحكم صاحب العمل مع إحصائيات
   - تتبع الطلبات من قبل المرشح
   - الوصول: بطاقة "HireNova IA Jobs" → سوق العروض

4. **HireNova IA Global** (أزرق مخضر)
   - أكثر من 40 دولة عبر 5 مناطق: أوروبا، آسيا، أفريقيا، الأمريكيتان، الشرق الأوسط وشمال أفريقيا
   - فلاتر متقدمة: المنطقة، الدولة، الكلمة المفتاحية
   - شارات: رعاية التأشيرة + حزمة الانتقال + العمل عن بُعد
   - لوحة تحكم عالمية لصاحب العمل مع إحصائيات حسب المنطقة
   - نشر عروض عمل دولية
   - مطابقة الذكاء الاصطناعي بين ملف المرشح والعرض
   - الوصول: بطاقة "HireNova IA Global" → السوق الدولي
   - المناطق: أوروبا (فرنسا، بريطانيا، ألمانيا، سويسرا، بلجيكا، إسبانيا، إيطاليا)، الأمريكيتان (أمريكا، كندا)، آسيا (اليابان، سنغافورة، الإمارات)، الشرق الأوسط (المغرب، مصر، السعودية، قطر)، أفريقيا (المغرب، جنوب أفريقيا، نيجيريا، كينيا)

5. **HireNova IA MOBILITY** (بنفسجي)
   - خط أنابيب OCR + NLP في 4 خطوات:
     * الخطوة 1: رفع السيرة الذاتية (PDF/صورة) → استخراج النص عبر OCR
     * الخطوة 2: تحليل الذكاء الاصطناعي (LLM + NLP) → ملف منظم (المهارات، الخبرة، التعليم)
     * الخطوة 3: إعادة صياغة تلقائية للسيرة الذاتية + رسالة تحفيزية حسب معايير الدولة المستهدفة
     * الخطوة 4: حساب درجة التوافق + كشف فجوات المهارات
   - 12 دولة مدعومة: فرنسا، بريطانيا، أمريكا، كندا، ألمانيا، الإمارات، سويسرا، بلجيكا، إسبانيا، إيطاليا، اليابان، أستراليا
   - الوصول: بطاقة "HireNova IA MOBILITY" → صفحة التنقل

6. **HireNova IA API** (سماوي)
   - بوابة المطورين REST
   - 4 نقاط نهاية: POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage
   - 3 خطط: Starter (مجاني، 100 طلب/شهر)، Pro (29€/شهر، 5000 طلب/شهر)، Enterprise (على حسب الطلب)
   - مفتاح API + لوحة تتبع الاستهلاك
   - الوصول: بطاقة "HireNova IA API" → وثائق API

7. **HireNova IA LinkedIn** (أزرق لينكدإن)
   - محسّن ملف لينكدإن بالذكاء الاصطناعي
   - تحليل وتحسين: العنوان، الملخص، الخبرة، المهارات
   - اقتراحات كلمات مفتاحية لظهورك لدى مسؤولي التوظيف
   - تحسين SEO لينكدإن
   - الوصول: بطاقة "HireNova IA LinkedIn" → نموذج تحسين الملف

8. **HireNova IA Recruiter** (برتقالي)
   - مطابقة الذكاء الاصطناعي بين المرشحين وعروض العمل
   - خوارزمية توافق متعددة المعايير
   - اقتراحات مرشحين لمسؤولي التوظيف
   - اقتراحات عروض عمل للمرشحين
   - لوحة تحكم مسؤول التوظيف مع خطوط توظيف
   - الوصول: بطاقة "HireNova IA Recruiter" → لوحة المطابقة

9. **HireNova IA Career** (وردي)
   - خريطة طريق مهنية مخصصة
   - تحليل المهارات الحالية مقابل المهارات المستهدفة
   - خطة تعلم مخصصة
   - معالم مهنية مع جداول زمنية
   - توصيات تدريب وشهادات
   - الوصول: بطاقة "HireNova IA Career" → صفحة خريطة الطريق

10. **HireNova IA Coach** (كهرماني)
    - مدرب مهني تفاعلي بالذكاء الاصطناعي
    - تحضير للمقابلات الوظيفية (مقابلات تجريبية)
    - ملاحظات مفصلة على الإجابات
    - نصائح التفاوض على الراتب
    - تخطيط التطوير المهني
    - الوصول: بطاقة "HireNova IA Coach" → جلسة تدريب

11. **HireNova IA Formation** (نيلي)
    - منصة تدريب وتطوير المهارات
    - مسارات تعلم مخصصة
    - محتوى: فيديو، مقالات، اختبارات تفاعلية
    - شهادات HireNova
    - تتبع التقدم
    - الوصول: بطاقة "HireNova IA Formation" → كتالوج التدريب

12. **HireNova IA Freelance** (بنفسجي)
    - سوق مستقل متكامل
    - ربط المستقلين بالعملاء
    - محفظة مشاريع
    - نظام دفع آمن
    - تقييمات وآراء
    - الوصول: بطاقة "HireNova IA Freelance" → السوق المستقل

13. **HireNova IA Interview** (أزرق مخضر)
    - محاكاة مقابلات عمل بالذكاء الاصطناعي
    - أسئلة مخصصة حسب المنصب والقطاع
    - تقييم الإجابات في الوقت الفعلي
    - تقرير مفصل بعد المقابلة
    - تحضير تقني وسلوكي
    - الوصول: بطاقة "HireNova IA Interview" → محاكي المقابلة

أسعار HireNova:
- مجاني: 3 سير ذاتية/شهر، علامة مائية، ميزات محدودة
- Pro (6.99€/شهر): سير ذاتية غير محدودة، رسائل، درجة ATS، تصدير PDF+Word، بدون علامة مائية
- سنوي (70€/سنة): كل ما في Pro + دعم أولوية
- مدى الحياة: دفعة واحدة، وصول دائم

أسعار API:
- Starter: مجاني، 100 طلب/شهر
- Pro: 29€/شهر، 5000 طلب/شهر
- Enterprise: على حسب الطلب`,

  es: `
MÓDULOS DEL ECOSISTEMA HIRENOVA (13 módulos):

1. **HireNova IA CV** (Esmeralda)
   - Generación de currículums profesionales con IA en 60 segundos
   - 4 idiomas: Francés, Inglés, Árabe, Español
   - 3 plantillas: Moderno, Clásico, Creativo
   - 6 perfiles: Estudiante, Graduado, Profesional, Ejecutivo, Freelance, Expatriado
   - Exportación PDF + Word, sin marca de agua (plan Pro)
   - Acceso: tarjeta "HireNova IA CV" en el ecosistema → formulario de CV

2. **HireNova IA ATS** (Esmeralda)
   - Puntuación de compatibilidad ATS (Sistema de Seguimiento de Candidatos) sobre 100
   - 4 categorías analizadas: Palabras clave/SEO, Estructura/Formato, Impacto de experiencia, Completitud
   - Sugerencias de mejora personalizadas
   - La puntuación ATS se calcula DESPUÉS de generar el CV (paso Vista Previa)
   - Acceso: tarjeta "HireNova IA ATS" → crea primero un CV, luego lanza el análisis ATS desde la página de Vista Previa

3. **HireNova IA Jobs** (Esmeralda)
   - Marketplace de ofertas de empleo locales (Marruecos e internacional)
   - Publica ofertas (empleador) o postula (candidato)
   - Dashboard de empleador con estadísticas
   - Seguimiento de postulaciones del candidato
   - Acceso: tarjeta "HireNova IA Jobs" → marketplace de ofertas

4. **HireNova IA Global** (Turquesa)
   - 40+ países en 5 regiones: Europa, Asia, África, Américas, MENA
   - Filtros avanzados: región, país, palabra clave
   - Insignias: Visa Sponsorship + Relocation Package + Remoto
   - Dashboard global de empleador con estadísticas por región
   - Publicación de ofertas internacionales
   - Matching IA entre perfil del candidato y oferta
   - Acceso: tarjeta "HireNova IA Global" → marketplace internacional
   - Regiones: Europa (FR, UK, DE, CH, BE, ES, IT), Américas (US, CA), Asia (JP, SG, AE), MENA (MA, EG, SA, QA), África (MA, ZA, NG, KE)

5. **HireNova IA MOBILITY** (Violeta)
   - Pipeline OCR + NLP en 4 pasos:
     * Paso 1: Subir CV (PDF/Imagen) → extracción OCR de texto
     * Paso 2: Análisis IA (LLM + NLP) → perfil estructurado (skills, experiencia, educación)
     * Paso 3: Reformulación automática de CV + carta de motivación según estándares del país destino
     * Paso 4: Cálculo de puntuación de compatibilidad + detección de brechas de skills
   - 12 países soportados: Francia, UK, USA, Canadá, Alemania, EAU, Suiza, Bélgica, España, Italia, Japón, Australia
   - Acceso: tarjeta "HireNova IA MOBILITY" → página de inicio Movilidad

6. **HireNova IA API** (Celeste)
   - Portal de desarrolladores REST
   - 4 endpoints: POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage
   - 3 planes: Starter (gratuito, 100 req/mes), Pro (29€/mes, 5000 req/mes), Enterprise (bajo presupuesto)
   - Clave API + dashboard de seguimiento de consumo
   - Acceso: tarjeta "HireNova IA API" → documentación API

7. **HireNova IA LinkedIn** (Azul LinkedIn)
   - Optimizador de perfil LinkedIn con IA
   - Análisis y mejora: titular, resumen, experiencia, habilidades
   - Sugerencias de palabras clave para visibilidad de reclutadores
   - Optimización SEO de LinkedIn
   - Acceso: tarjeta "HireNova IA LinkedIn" → formulario de optimización de perfil

8. **HireNova IA Recruiter** (Naranja)
   - Matching IA candidato/oferta de empleo
   - Algoritmo de compatibilidad multi-criterios
   - Sugerencias de candidatos para reclutadores
   - Sugerencias de ofertas para candidatos
   - Dashboard de reclutador con pipelines de reclutamiento
   - Acceso: tarjeta "HireNova IA Recruiter" → dashboard de matching

9. **HireNova IA Career** (Rosa)
   - Hoja de ruta profesional personalizada
   - Análisis de habilidades actuales vs. habilidades objetivo
   - Plan de aprendizaje personalizado
   - Hitos profesionales con timelines
   - Recomendaciones de formación y certificaciones
   - Acceso: tarjeta "HireNova IA Career" → página de roadmap

10. **HireNova IA Coach** (Ámbar)
    - Coach profesional interactivo con IA
    - Preparación para entrevistas de trabajo (mock interviews)
    - Feedback detallado sobre las respuestas
    - Consejos de negociación salarial
    - Planificación de desarrollo profesional
    - Acceso: tarjeta "HireNova IA Coach" → sesión de coaching

11. **HireNova IA Formation** (Índigo)
    - Plataforma de formación y desarrollo de habilidades
    - Rutas de aprendizaje personalizadas
    - Contenido: video, artículos, quizzes interactivos
    - Certificaciones HireNova
    - Seguimiento de progreso
    - Acceso: tarjeta "HireNova IA Formation" → catálogo de formaciones

12. **HireNova IA Freelance** (Violeta)
    - Marketplace freelance integrado
    - Conexión freelancers/clientes
    - Portafolio de proyectos
    - Sistema de pagos seguros
    - Calificaciones y reseñas
    - Acceso: tarjeta "HireNova IA Freelance" → marketplace freelance

13. **HireNova IA Interview** (Turquesa)
    - Simulación de entrevistas de trabajo con IA
    - Preguntas adaptadas al puesto y sector
    - Evaluación en tiempo real de respuestas
    - Reporte detallado post-entrevista
    - Preparación técnica y conductual
    - Acceso: tarjeta "HireNova IA Interview" → simulador de entrevistas

TARIFICACIÓN HIRENOVA:
- Gratuito: 3 CVs/mes, marca de agua, funciones limitadas
- Pro (6,99€/mes): CVs ilimitados, cartas, puntuación ATS, exportación PDF+Word, sin marca de agua
- Anual (70€/año): Todo Pro + soporte prioritario
- Lifetime: pago único, acceso permanente

TARIFICACIÓN API:
- Starter: Gratuito, 100 peticiones/mes
- Pro: 29€/mes, 5000 peticiones/mes
- Enterprise: Bajo presupuesto`
}

// ─── Mode-Specific System Prompt Additions ────────────────────────────────
const MODE_PROMPTS: Record<Lang, Record<Mode, string>> = {
  fr: {
    advisor: `\n\nMode: CONSEILLER DE CARRIÈRE — Tu es un conseiller de carrière bienveillant et expert. Tu aides les utilisateurs avec: préparation aux entretiens, optimisation de CV, stratégies de recherche d'emploi, développement de compétences, conseils de négociation salariale, planification de carrière. Utilise le knowledge base HireNova pour orienter vers les bons outils quand c'est pertinent. Réponds en français.`,
    support: `\n\nMode: SUPPORT TECHNIQUE — Tu résous les problèmes techniques, bugs, problèmes de facturation, questions sur les plans, problèmes de compte. Si le problème nécessite une intervention humaine, informe que le support peut créer un ticket à support@hirenova.app. Réponds en français.`,
    products: `\n\nMode: PRODUITS — Tu es l'expert produit HireNova. Tu connais en détail les 13 modules de l'écosystème. Quand on te demande sur un module, explique le flux complet étape par étape, les fonctionnalités, les tarifs. Quand on te demande où accéder, indique la carte correspondante dans l'écosystème. Réponds en français.`
  },
  en: {
    advisor: `\n\nMode: CAREER ADVISOR — You are a compassionate and expert career advisor. You help users with: interview preparation, CV optimization, job search strategies, skill development, salary negotiation advice, career planning. Use the HireNova knowledge base to guide users to the right tools when relevant. Respond in English.`,
    support: `\n\nMode: TECHNICAL SUPPORT — You resolve technical issues, bugs, billing questions, plan inquiries, account problems. If the issue requires human intervention, inform that support can create a ticket at support@hirenova.app. Respond in English.`,
    products: `\n\nMode: PRODUCTS — You are the HireNova product expert. You know all 13 ecosystem modules in detail. When asked about a module, explain the complete step-by-step flow, features, and pricing. When asked how to access a module, indicate the corresponding card in the ecosystem. Respond in English.`
  },
  ar: {
    advisor: `\n\nالوضع: مستشار مهني — أنت مستشار مهني خبير ومتعاطف. تساعد المستخدمين في: التحضير للمقابلات، تحسين السيرة الذاتية، استراتيجيات البحث عن عمل، تطوير المهارات، نصائح التفاوض على الراتب، تخطيط المسار المهني. استخدم قاعدة معرفة HireNova لتوجيه المستخدمين للأدوات المناسبة عند الحاجة. أجب بالعربية.`,
    support: `\n\nالوضع: الدعم الفني — تحل المشاكل التقنية، الأخطاء، أسئلة الفوترة، استفسارات الخطط، مشاكل الحساب. إذا تطلب الأمر تدخلاً بشرياً، أخبر أن الدعم يمكنه إنشاء تذكرة على support@hirenova.app. أجب بالعربية.`,
    products: `\n\nالوضع: المنتجات — أنت خبير منتجات HireNova. تعرف جميع وحدات المنظومة الـ13 بالتفصيل. عند السؤال عن وحدة، اشرح مسار العمل الكامل خطوة بخطوة، الميزات، والأسعار. عند السؤال عن كيفية الوصول، أشر إلى البطاقة المقابلة في المنظومة. أجب بالعربية.`
  },
  es: {
    advisor: `\n\nModo: ASESOR DE CARRERA — Eres un asesor de carrera experto y compasivo. Ayudas a los usuarios con: preparación para entrevistas, optimización de CV, estrategias de búsqueda de empleo, desarrollo de habilidades, consejos de negociación salarial, planificación profesional. Usa la base de conocimiento de HireNova para guiar a los usuarios hacia las herramientas adecuadas cuando sea relevante. Responde en español.`,
    support: `\n\nModo: SOPORTE TÉCNICO — Resuelves problemas técnicos, bugs, preguntas de facturación, consultas de planes, problemas de cuenta. Si el problema requiere intervención humana, informa que el soporte puede crear un ticket en support@hirenova.app. Responde en español.`,
    products: `\n\nModo: PRODUCTOS — Eres el experto en productos de HireNova. Conoces en detalle los 13 módulos del ecosistema. Cuando te preguntan sobre un módulo, explica el flujo completo paso a paso, las características y los precios. Cuando te preguntan cómo acceder, indica la tarjeta correspondiente en el ecosistema. Responde en español.`
  }
}

// ─── Rule-Based Responses (multilingual, instant, no SDK cost) ─────────────
function ruleBasedResponse(message: string, mode: Mode, lang: Lang): string | null {
  const q = message.toLowerCase().trim()

  // Global / International
  if (/global|international|visa|relocation|expatri|monde|pays|internacional|دولي|تأشيرة|reubicaci/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🌍 **HireNova IA Global — Recrutement International**\n\nHireNova IA Global est notre module de recrutement international couvrant 40+ pays sur 5 régions (Europe, Asie, Afrique, Amériques, MENA).\n\n**Comment ça fonctionne :**\n1. Cliquez sur la carte "HireNova IA Global" (couleur teal) dans l'écosystème\n2. Filtrez par région, pays ou mot-clé\n3. Repérez les badges : 🛂 Visa Sponsorship, 📦 Relocation Package, 🏠 Remote\n4. Consultez le détail de l'offre puis postulez\n\n**Pour les employeurs :** Dashboard global avec statistiques par région, publication d'offres internationales.\n**Pour les candidats :** Matching IA entre votre profil et l'offre, candidature multilingue.`,
      en: `🌍 **HireNova IA Global — International Recruitment**\n\nHireNova IA Global is our international recruitment module covering 40+ countries across 5 regions (Europe, Asia, Africa, Americas, MENA).\n\n**How it works:**\n1. Click the "HireNova IA Global" card (teal) in the ecosystem\n2. Filter by region, country, or keyword\n3. Look for badges: 🛂 Visa Sponsorship, 📦 Relocation Package, 🏠 Remote\n4. View the job details and apply\n\n**For employers:** Global dashboard with per-region statistics, international job posting.\n**For candidates:** AI matching between your profile and the job, multilingual application.`,
      ar: `🌍 **HireNova IA Global — التوظيف الدولي**\n\nHireNova IA Global هو وحدة التوظيف الدولي الخاص بنا ويغطي أكثر من 40 دولة عبر 5 مناطق (أوروبا، آسيا، أفريقيا، الأمريكيتان، الشرق الأوسط وشمال أفريقيا).\n\n**كيف يعمل:**\n1. انقر على بطاقة "HireNova IA Global" (اللون الأزرق المخضر) في المنظومة\n2. فلتر حسب المنطقة أو الدولة أو الكلمة المفتاحية\n3. ابحث عن الشارات: 🛂 رعاية التأشيرة، 📦 حزمة الانتقال، 🏠 عمل عن بُعد\n4. عرض تفاصيل العرض ثم تقدم\n\n**أصحاب العمل:** لوحة تحكم عالمية مع إحصائيات حسب المنطقة، نشر عروض دولية.\n**المرشحون:** مطابقة الذكاء الاصطناعي بين ملفك والعرض، تقديم متعدد اللغات.`,
      es: `🌍 **HireNova IA Global — Reclutamiento Internacional**\n\nHireNova IA Global es nuestro módulo de reclutamiento internacional que cubre 40+ países en 5 regiones (Europa, Asia, África, Américas, MENA).\n\n**Cómo funciona:**\n1. Haz clic en la tarjeta "HireNova IA Global" (turquesa) en el ecosistema\n2. Filtra por región, país o palabra clave\n3. Busca las insignias: 🛂 Visa Sponsorship, 📦 Relocation Package, 🏠 Remoto\n4. Ve los detalles de la oferta y postula\n\n**Para empleadores:** Dashboard global con estadísticas por región, publicación de ofertas internacionales.\n**Para candidatos:** Matching IA entre tu perfil y la oferta, postulación multilingüe.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // Mobilité / Mobility
  if (/mobilit|ocr|reformul|adapter.*cv|standard.*pays|pays cible|movilidad|تنقل|تكيف/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `✈️ **HireNova IA MOBILITY — OCR + NLP Pipeline**\n\nHireNova IA MOBILITY adapte votre CV aux standards de chaque pays via un pipeline IA en 4 étapes :\n\n1. **Upload** : Téléversez votre CV (PDF ou image)\n2. **OCR** : Extraction automatique du texte brut\n3. **Analyse IA (LLM+NLP)** : Structuration en profil (skills, expérience, éducation) + calcul du score de compatibilité avec le pays cible\n4. **Reformulation** : CV + lettre de motivation automatiquement adaptés aux normes du pays\n\n**12 pays supportés** : 🇫🇷 France, 🇬🇧 UK, 🇺🇸 USA, 🇨🇦 Canada, 🇩🇪 Allemagne, 🇦🇪 UAE, 🇨🇭 Suisse, 🇧🇪 Belgique, 🇪🇸 Espagne, 🇮🇹 Italie, 🇯🇵 Japon, 🇦🇺 Australie.\n\nAccès : carte "HireNova IA MOBILITY" (couleur violet) dans l'écosystème.`,
      en: `✈️ **HireNova IA MOBILITY — OCR + NLP Pipeline**\n\nHireNova IA MOBILITY adapts your CV to each country's standards via a 4-step AI pipeline:\n\n1. **Upload**: Upload your CV (PDF or image)\n2. **OCR**: Automatic text extraction\n3. **AI Analysis (LLM+NLP)**: Profile structuring (skills, experience, education) + compatibility score calculation with target country\n4. **Reformulation**: CV + cover letter automatically adapted to country standards\n\n**12 supported countries**: 🇫🇷 France, 🇬🇧 UK, 🇺🇸 USA, 🇨🇦 Canada, 🇩🇪 Germany, 🇦🇪 UAE, 🇨🇭 Switzerland, 🇧🇪 Belgium, 🇪🇸 Spain, 🇮🇹 Italy, 🇯🇵 Japan, 🇦🇺 Australia\n\nAccess: "HireNova IA MOBILITY" card (violet) in the ecosystem.`,
      ar: `✈️ **HireNova IA MOBILITY — خط أنابيب OCR + NLP**\n\nHireNova IA MOBILITY يكيف سيرتك الذاتية مع معايير كل دولة عبر خط أنابيب ذكاء اصطناعي من 4 خطوات:\n\n1. **الرفع**: ارفع سيرتك الذاتية (PDF أو صورة)\n2. **OCR**: استخراج نص تلقائي\n3. **تحليل الذكاء الاصطناعي (LLM+NLP)**: تنظيم الملف (المهارات، الخبرة، التعليم) + حساب درجة التوافق مع الدولة المستهدفة\n4. **إعادة الصياغة**: سيرة ذاتية + رسالة تحفيزية مكيّفة تلقائياً مع معايير الدولة\n\n**12 دولة مدعومة**: 🇫🇷 فرنسا، 🇬🇧 بريطانيا، 🇺🇸 أمريكا، 🇨🇦 كندا، 🇩🇪 ألمانيا، 🇦🇪 الإمارات، 🇨🇭 سويسرا، 🇧🇪 بلجيكا، 🇪🇸 إسبانيا، 🇮🇹 إيطاليا، 🇯🇵 اليابان، 🇦🇺 أستراليا\n\nالوصول: بطاقة "HireNova IA MOBILITY" (بنفسجي) في المنظومة.`,
      es: `✈️ **HireNova IA MOBILITY — Pipeline OCR + NLP**\n\nHireNova IA MOBILITY adapta tu CV a los estándares de cada país a través de un pipeline de IA en 4 pasos:\n\n1. **Subida**: Sube tu CV (PDF o imagen)\n2. **OCR**: Extracción automática de texto\n3. **Análisis IA (LLM+NLP)**: Estructuración de perfil (skills, experiencia, educación) + cálculo de puntuación de compatibilidad con el país destino\n4. **Reformulación**: CV + carta de motivación adaptados automáticamente a los estándares del país\n\n**12 países soportados**: 🇫🇷 Francia, 🇬🇧 UK, 🇺🇸 USA, 🇨🇦 Canadá, 🇩🇪 Alemania, 🇦🇪 EAU, 🇨🇭 Suiza, 🇧🇪 Bélgica, 🇪🇸 España, 🇮🇹 Italia, 🇯🇵 Japón, 🇦🇺 Australia\n\nAcceso: tarjeta "HireNova IA MOBILITY" (violeta) en el ecosistema.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // CV
  if (/^.*cv.*$/.test(q) && /comment|marche|fonction|cré|gener|fais|how|work|function|create|generat|cómo|funciona|crear|gener|كيف|يعمل|إنشاء|سيرة/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `📄 **HireNova IA CV — Générateur de CV IA**\n\nCréez un CV professionnel en 60 secondes :\n\n1. Cliquez sur la carte "HireNova IA CV" dans l'écosystème\n2. Choisissez votre persona (Étudiant, Diplômé, Professionnel, Cadre, Freelance, Expatrié)\n3. Sélectionnez un template (Moderne, Classique, Créatif) et la langue (FR/EN/AR/ES)\n4. Remplissez le formulaire en 4 étapes : Identité, Expérience, Éducation, Compétences\n5. L'IA génère votre CV optimisé en quelques secondes\n6. Exportez en PDF ou Word (plan Pro)\n\n**Gratuit** : 3 CV/mois. **Pro** : 6.99€/mois, CV illimités.`,
      en: `📄 **HireNova IA CV — AI CV Generator**\n\nCreate a professional CV in 60 seconds:\n\n1. Click the "HireNova IA CV" card in the ecosystem\n2. Choose your persona (Student, Graduate, Professional, Executive, Freelancer, Expat)\n3. Select a template (Modern, Classic, Creative) and language (FR/EN/AR/ES)\n4. Fill in the 4-step form: Identity, Experience, Education, Skills\n5. AI generates your optimized CV in seconds\n6. Export as PDF or Word (Pro plan)\n\n**Free**: 3 CVs/month. **Pro**: €6.99/month, unlimited CVs.`,
      ar: `📄 **HireNova IA CV — مولّد السيرة الذاتية بالذكاء الاصطناعي**\n\nأنشئ سيرة ذاتية احترافية في 60 ثانية:\n\n1. انقر على بطاقة "HireNova IA CV" في المنظومة\n2. اختر شخصيتك (طالب، خريج، محترف، مدير تنفيذي، مستقل، مغترب)\n3. اختر قالباً (عصري، كلاسيكي، إبداعي) ولغة (FR/EN/AR/ES)\n4. املأ النموذج في 4 خطوات: الهوية، الخبرة، التعليم، المهارات\n5. الذكاء الاصطناعي ينشئ سيرتك الذاتية المحسّنة في ثوانٍ\n6. صدّر كـ PDF أو Word (خطة Pro)\n\n**مجاني**: 3 سير ذاتية/شهر. **Pro**: 6.99€/شهر، غير محدود.`,
      es: `📄 **HireNova IA CV — Generador de CV con IA**\n\nCrea un currículum profesional en 60 segundos:\n\n1. Haz clic en la tarjeta "HireNova IA CV" en el ecosistema\n2. Elige tu perfil (Estudiante, Graduado, Profesional, Ejecutivo, Freelance, Expatriado)\n3. Selecciona una plantilla (Moderno, Clásico, Creativo) e idioma (FR/EN/AR/ES)\n4. Rellena el formulario en 4 pasos: Identidad, Experiencia, Educación, Habilidades\n5. La IA genera tu CV optimizado en segundos\n6. Exporta como PDF o Word (plan Pro)\n\n**Gratuito**: 3 CVs/mes. **Pro**: 6,99€/mes, CVs ilimitados.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // ATS
  if (/ats|score|compatib|tracking|applicant|توافق/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🎯 **HireNova IA ATS — Score de Compatibilité**\n\nL'analyse ATS évalue la compatibilité de votre CV avec les systèmes de tri automatique des recruteurs.\n\n**Comment ça marche :**\n1. Créez d'abord un CV (carte "HireNova IA CV")\n2. Sur la page Preview, cliquez sur "Analyse ATS"\n3. Obtenez un score sur 100 avec 4 catégories :\n   - 🎯 Mots-clés / SEO\n   - 🛡️ Structure / Format\n   - 📈 Impact de l'expérience\n   - ✅ Complétude\n4. Recevez des suggestions d'amélioration personnalisées\n\n**Astuce** : visez un score > 80 pour passer les filtres ATS.`,
      en: `🎯 **HireNova IA ATS — Compatibility Score**\n\nATS analysis evaluates your CV's compatibility with recruiter screening systems.\n\n**How it works:**\n1. Create a CV first ("HireNova IA CV" card)\n2. On the Preview page, click "ATS Analysis"\n3. Get a score out of 100 with 4 categories:\n   - 🎯 Keywords / SEO\n   - 🛡️ Structure / Format\n   - 📈 Experience Impact\n   - ✅ Completeness\n4. Receive personalized improvement suggestions\n\n**Tip**: Aim for a score > 80 to pass most ATS filters.`,
      ar: `🎯 **HireNova IA ATS — درجة التوافق**\n\nيقيّم تحليل ATS مدى توافق سيرتك الذاتية مع أنظمة فرز مسؤولي التوظيف.\n\n**كيف يعمل:**\n1. أنشئ سيرة ذاتية أولاً (بطاقة "HireNova IA CV")\n2. على صفحة المعاينة، انقر "تحليل ATS"\n3. احصل على درجة من 100 مع 4 فئات:\n   - 🎯 الكلمات المفتاحية / SEO\n   - 🛡️ الهيكل / التنسيق\n   - 📈 تأثير الخبرة\n   - ✅ الاكتمال\n4. استلم اقتراحات تحسين مخصصة\n\n**نصيحة**: استهدف درجة > 80 لاجتياز فلاتر ATS.`,
      es: `🎯 **HireNova IA ATS — Puntuación de Compatibilidad**\n\nEl análisis ATS evalúa la compatibilidad de tu CV con los sistemas de filtrado de reclutadores.\n\n**Cómo funciona:**\n1. Crea primero un CV (tarjeta "HireNova IA CV")\n2. En la página de Vista Previa, haz clic en "Análisis ATS"\n3. Obtén una puntuación sobre 100 con 4 categorías:\n   - 🎯 Palabras clave / SEO\n   - 🛡️ Estructura / Formato\n   - 📈 Impacto de experiencia\n   - ✅ Completitud\n4. Recibe sugerencias de mejora personalizadas\n\n**Consejo**: Apunta a una puntuación > 80 para pasar los filtros ATS.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // Jobs
  if (/jobs|emploi|offre|marketplace|postul|trabajo|oferta|empleo|وظائف|عمل|عروض/.test(q) && !/global|international|internacional|دولي/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `💼 **HireNova IA Jobs — Marketplace d'Emplois**\n\nHireNova IA Jobs connecte candidats et employeurs au Maroc et à l'international.\n\n**Candidats :** Parcourez les offres, filtrez, postulez en un clic, suivez vos candidatures.\n**Employeurs :** Publiez des offres, dashboard avec statistiques, gérez les candidatures.\n\nAccès : carte "HireNova IA Jobs" dans l'écosystème.`,
      en: `💼 **HireNova IA Jobs — Job Marketplace**\n\nHireNova IA Jobs connects candidates and employers in Morocco and internationally.\n\n**Candidates:** Browse offers, filter, apply in one click, track your applications.\n**Employers:** Post jobs, dashboard with statistics, manage applications.\n\nAccess: "HireNova IA Jobs" card in the ecosystem.`,
      ar: `💼 **HireNova IA Jobs — سوق الوظائف**\n\nيربط HireNova IA Jobs المرشحين وأصحاب العمل في المغرب ودولياً.\n\n**المرشحون:** تصفح العروض، فلتر، تقدم بنقرة واحدة، تابع طلباتك.\n**أصحاب العمل:** انشر عروض عمل، لوحة تحكم مع إحصائيات، أدِر الطلبات.\n\nالوصول: بطاقة "HireNova IA Jobs" في المنظومة.`,
      es: `💼 **HireNova IA Jobs — Marketplace de Empleos**\n\nHireNova IA Jobs conecta candidatos y empleadores en Marruecos e internacionalmente.\n\n**Candidatos:** Navega ofertas, filtra, postula en un clic, rastrea tus postulaciones.\n**Empleadores:** Publica ofertas, dashboard con estadísticas, gestiona postulaciones.\n\nAcceso: tarjeta "HireNova IA Jobs" en el ecosistema.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // API
  if (/api|endpoint|developer|développeur|rest|intégr|desarrollador|integraci/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🔌 **HireNova IA API — Portail Développeur**\n\nIntégrez les fonctionnalités HireNova via notre API REST.\n\n**Endpoints :** POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage\n\n**Plans :** Starter (gratuit, 100 req/mois), Pro (29€/mois, 5000 req/mois), Enterprise (sur devis)\n\nAccès : carte "HireNova IA API" dans l'écosystème.`,
      en: `🔌 **HireNova IA API — Developer Portal**\n\nIntegrate HireNova features via our REST API.\n\n**Endpoints:** POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage\n\n**Plans:** Starter (free, 100 req/month), Pro (€29/month, 5000 req/month), Enterprise (custom pricing)\n\nAccess: "HireNova IA API" card in the ecosystem.`,
      ar: `🔌 **HireNova IA API — بوابة المطورين**\n\nادمج ميزات HireNova عبر واجهة REST API الخاصة بنا.\n\n**نقاط النهاية:** POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage\n\n**الخطط:** Starter (مجاني، 100 طلب/شهر)، Pro (29€/شهر، 5000 طلب/شهر)، Enterprise (حسب الطلب)\n\nالوصول: بطاقة "HireNova IA API" في المنظومة.`,
      es: `🔌 **HireNova IA API — Portal de Desarrolladores**\n\nIntegra las funciones de HireNova a través de nuestra API REST.\n\n**Endpoints:** POST /api/v1/cv/generate, POST /api/v1/cl/generate, POST /api/v1/ats/analyze, GET /api/v1/usage\n\n**Planes:** Starter (gratuito, 100 peticiones/mes), Pro (29€/mes, 5000 peticiones/mes), Enterprise (bajo presupuesto)\n\nAcceso: tarjeta "HireNova IA API" en el ecosistema.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // LinkedIn
  if (/linkedin|لينكدإن|perfil.*linkedin/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🔗 **HireNova IA LinkedIn — Optimiseur de Profil**\n\nOptimisez votre profil LinkedIn grâce à l'IA :\n- Analyse et amélioration du headline, résumé, expérience et compétences\n- Suggestions de mots-clés pour la visibilité recruteurs\n- Optimisation SEO LinkedIn\n\nAccès : carte "HireNova IA LinkedIn" dans l'écosystème.`,
      en: `🔗 **HireNova IA LinkedIn — Profile Optimizer**\n\nOptimize your LinkedIn profile with AI:\n- Analysis and improvement of headline, summary, experience, and skills\n- Keyword suggestions for recruiter visibility\n- LinkedIn SEO optimization\n\nAccess: "HireNova IA LinkedIn" card in the ecosystem.`,
      ar: `🔗 **HireNova IA LinkedIn — محسّن الملف الشخصي**\n\nحسّن ملفك على لينكدإن بالذكاء الاصطناعي:\n- تحليل وتحسين العنوان، الملخص، الخبرة والمهارات\n- اقتراحات كلمات مفتاحية لظهورك لدى مسؤولي التوظيف\n- تحسين SEO لينكدإن\n\nالوصول: بطاقة "HireNova IA LinkedIn" في المنظومة.`,
      es: `🔗 **HireNova IA LinkedIn — Optimizador de Perfil**\n\nOptimiza tu perfil de LinkedIn con IA:\n- Análisis y mejora de titular, resumen, experiencia y habilidades\n- Sugerencias de palabras clave para visibilidad de reclutadores\n- Optimización SEO de LinkedIn\n\nAcceso: tarjeta "HireNova IA LinkedIn" en el ecosistema.`
    }
    if (mode === 'products') return responses[lang]
  }

  // Recruiter
  if (/recruiter|matching|reclutador|توظيف|مطابقة/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🤝 **HireNova IA Recruiter — Matching IA**\n\nMatching intelligent entre candidats et offres d'emploi :\n- Algorithme de compatibilité multi-critères\n- Suggestions de candidats pour les recruteurs\n- Suggestions d'offres pour les candidats\n- Dashboard recruteur avec pipelines\n\nAccès : carte "HireNova IA Recruiter" dans l'écosystème.`,
      en: `🤝 **HireNova IA Recruiter — AI Matching**\n\nSmart matching between candidates and job offers:\n- Multi-criteria compatibility algorithm\n- Candidate suggestions for recruiters\n- Job suggestions for candidates\n- Recruiter dashboard with pipelines\n\nAccess: "HireNova IA Recruiter" card in the ecosystem.`,
      ar: `🤝 **HireNova IA Recruiter — مطابقة الذكاء الاصطناعي**\n\nمطابقة ذكية بين المرشحين وعروض العمل:\n- خوارزمية توافق متعددة المعايير\n- اقتراحات مرشحين لمسؤولي التوظيف\n- اقتراحات عروض للمرشحين\n- لوحة تحكم مسؤول التوظيف مع خطوط توظيف\n\nالوصول: بطاقة "HireNova IA Recruiter" في المنظومة.`,
      es: `🤝 **HireNova IA Recruiter — Matching IA**\n\nMatching inteligente entre candidatos y ofertas de empleo:\n- Algoritmo de compatibilidad multi-criterios\n- Sugerencias de candidatos para reclutadores\n- Sugerencias de ofertas para candidatos\n- Dashboard de reclutador con pipelines\n\nAcceso: tarjeta "HireNova IA Recruiter" en el ecosistema.`
    }
    if (mode === 'products') return responses[lang]
  }

  // Career Roadmap
  if (/career|roadmap|parcours|مسار.*مهني|hoja.*ruta|plan.*carrera/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🗺️ **HireNova IA Career — Feuille de Route Professionnelle**\n\nPlanifiez votre évolution professionnelle :\n- Analyse des compétences actuelles vs. cibles\n- Plan d'apprentissage sur mesure\n- Jalons de carrière avec timelines\n- Recommandations de formations et certifications\n\nAccès : carte "HireNova IA Career" dans l'écosystème.`,
      en: `🗺️ **HireNova IA Career — Career Roadmap**\n\nPlan your professional evolution:\n- Analysis of current vs. target skills\n- Custom learning plan\n- Career milestones with timelines\n- Training and certification recommendations\n\nAccess: "HireNova IA Career" card in the ecosystem.`,
      ar: `🗺️ **HireNova IA Career — خريطة الطريق المهنية**\n\nخطط لتطويرك المهني:\n- تحليل المهارات الحالية مقابل المستهدفة\n- خطة تعلم مخصصة\n- معالم مهنية مع جداول زمنية\n- توصيات تدريب وشهادات\n\nالوصول: بطاقة "HireNova IA Career" في المنظومة.`,
      es: `🗺️ **HireNova IA Career — Hoja de Ruta Profesional**\n\nPlanifica tu evolución profesional:\n- Análisis de habilidades actuales vs. objetivo\n- Plan de aprendizaje personalizado\n- Hitos profesionales con timelines\n- Recomendaciones de formación y certificaciones\n\nAcceso: tarjeta "HireNova IA Career" en el ecosistema.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // Coach
  if (/coach|coaching|entraîneur|تدريب|مدرب|entrenador|asesoramiento/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🎓 **HireNova IA Coach — Coach IA de Carrière**\n\nVotre coach interactif pour :\n- Préparation aux entretiens (mock interviews)\n- Retour détaillé sur vos réponses\n- Conseils de négociation salariale\n- Planification de développement professionnel\n\nAccès : carte "HireNova IA Coach" dans l'écosystème.`,
      en: `🎓 **HireNova IA Coach — AI Career Coach**\n\nYour interactive coach for:\n- Interview preparation (mock interviews)\n- Detailed feedback on your answers\n- Salary negotiation advice\n- Professional development planning\n\nAccess: "HireNova IA Coach" card in the ecosystem.`,
      ar: `🎓 **HireNova IA Coach — مدرب مهني بالذكاء الاصطناعي**\n\nمدربك التفاعلي لـ:\n- التحضير للمقابلات (مقابلات تجريبية)\n- ملاحظات مفصلة على إجاباتك\n- نصائح التفاوض على الراتب\n- تخطيط التطوير المهني\n\nالوصول: بطاقة "HireNova IA Coach" في المنظومة.`,
      es: `🎓 **HireNova IA Coach — Coach Profesional IA**\n\nTu coach interactivo para:\n- Preparación para entrevistas (mock interviews)\n- Feedback detallado sobre tus respuestas\n- Consejos de negociación salarial\n- Planificación de desarrollo profesional\n\nAcceso: tarjeta "HireNova IA Coach" en el ecosistema.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // Formation
  if (/formation|training|تدريب|تعليم|formaci|aprendizaje|curso/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `📚 **HireNova IA Formation — Plateforme de Formation**\n\nDéveloppez vos compétences :\n- Parcours d'apprentissage personnalisés\n- Contenu varié : vidéo, articles, quiz interactifs\n- Certifications HireNova\n- Suivi de progression\n\nAccès : carte "HireNova IA Formation" dans l'écosystème.`,
      en: `📚 **HireNova IA Formation — Training Platform**\n\nDevelop your skills:\n- Personalized learning paths\n- Varied content: video, articles, interactive quizzes\n- HireNova certifications\n- Progress tracking\n\nAccess: "HireNova IA Formation" card in the ecosystem.`,
      ar: `📚 **HireNova IA Formation — منصة التدريب**\n\nطوّر مهاراتك:\n- مسارات تعلم مخصصة\n- محتوى متنوع: فيديو، مقالات، اختبارات تفاعلية\n- شهادات HireNova\n- تتبع التقدم\n\nالوصول: بطاقة "HireNova IA Formation" في المنظومة.`,
      es: `📚 **HireNova IA Formation — Plataforma de Formación**\n\nDesarrolla tus habilidades:\n- Rutas de aprendizaje personalizadas\n- Contenido variado: video, artículos, quizzes interactivos\n- Certificaciones HireNova\n- Seguimiento de progreso\n\nAcceso: tarjeta "HireNova IA Formation" en el ecosistema.`
    }
    if (mode === 'products') return responses[lang]
  }

  // Freelance
  if (/freelance|freelancer|independant|مستقل|حُر|freelance/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `💼 **HireNova IA Freelance — Marketplace Freelance**\n\nTrouvez des missions ou des freelances :\n- Mise en relation freelances/clients\n- Portefeuille de projets\n- Système de paiements sécurisés\n- Évaluations et avis\n\nAccès : carte "HireNova IA Freelance" dans l'écosystème.`,
      en: `💼 **HireNova IA Freelance — Freelance Marketplace**\n\nFind projects or freelancers:\n- Freelancer/client matching\n- Project portfolio\n- Secure payment system\n- Ratings and reviews\n\nAccess: "HireNova IA Freelance" card in the ecosystem.`,
      ar: `💼 **HireNova IA Freelance — السوق المستقل**\n\nاعثر على مشاريع أو مستقلين:\n- ربط المستقلين بالعملاء\n- محفظة مشاريع\n- نظام دفع آمن\n- تقييمات وآراء\n\nالوصول: بطاقة "HireNova IA Freelance" في المنظومة.`,
      es: `💼 **HireNova IA Freelance — Marketplace Freelance**\n\nEncuentra proyectos o freelancers:\n- Conexión freelancers/clientes\n- Portafolio de proyectos\n- Sistema de pagos seguros\n- Calificaciones y reseñas\n\nAcceso: tarjeta "HireNova IA Freelance" en el ecosistema.`
    }
    if (mode === 'products') return responses[lang]
  }

  // Interview
  if (/interview|entretien|مقابل|entrevista/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `🎤 **HireNova IA Interview — Simulation d'Entretiens IA**\n\nPréparez-vous aux entretiens :\n- Questions adaptées au poste et au secteur\n- Évaluation en temps réel de vos réponses\n- Rapport détaillé post-entretien\n- Préparation technique et comportementale\n\nAccès : carte "HireNova IA Interview" dans l'écosystème.`,
      en: `🎤 **HireNova IA Interview — AI Interview Simulation**\n\nPrepare for interviews:\n- Questions tailored to the position and industry\n- Real-time answer evaluation\n- Detailed post-interview report\n- Technical and behavioral preparation\n\nAccess: "HireNova IA Interview" card in the ecosystem.`,
      ar: `🎤 **HireNova IA Interview — محاكاة مقابلات بالذكاء الاصطناعي**\n\nحضّر للمقابلات:\n- أسئلة مخصصة حسب المنصب والقطاع\n- تقييم الإجابات في الوقت الفعلي\n- تقرير مفصل بعد المقابلة\n- تحضير تقني وسلوكي\n\nالوصول: بطاقة "HireNova IA Interview" في المنظومة.`,
      es: `🎤 **HireNova IA Interview — Simulación de Entrevistas IA**\n\nPrepárate para entrevistas:\n- Preguntas adaptadas al puesto y sector\n- Evaluación en tiempo real de respuestas\n- Reporte detallado post-entrevista\n- Preparación técnica y conductual\n\nAcceso: tarjeta "HireNova IA Interview" en el ecosistema.`
    }
    if (mode === 'advisor' || mode === 'products') return responses[lang]
  }

  // Tarification / Pricing
  if (/prix|tarif|coût|coute|combien|plan|gratuit|pro|lifetime|annuel|price|pricing|cost|free|annual|precio|costo|gratis|سعر|تكلفة|مجاني/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `💳 **Tarification HireNova**\n\n**CV Generator :**\n- Gratuit : 3 CV/mois, watermark\n- Pro : 6.99€/mois — CV illimités, lettres, ATS, export PDF+Word\n- Annuel : 70€/an — Tout Pro + priorité support\n- Lifetime : paiement unique, accès permanent\n\n**API :**\n- Starter : gratuit, 100 req/mois\n- Pro : 29€/mois, 5000 req/mois\n- Enterprise : sur devis`,
      en: `💳 **HireNova Pricing**\n\n**CV Generator:**\n- Free: 3 CVs/month, watermark\n- Pro: €6.99/month — Unlimited CVs, cover letters, ATS, PDF+Word export\n- Annual: €70/year — Everything in Pro + priority support\n- Lifetime: One-time payment, permanent access\n\n**API:**\n- Starter: Free, 100 req/month\n- Pro: €29/month, 5000 req/month\n- Enterprise: Custom pricing`,
      ar: `💳 **أسعار HireNova**\n\n**مولّد السير الذاتية:**\n- مجاني: 3 سير ذاتية/شهر، علامة مائية\n- Pro: 6.99€/شهر — غير محدود، رسائل، ATS، تصدير PDF+Word\n- سنوي: 70€/سنة — كل ما في Pro + دعم أولوية\n- مدى الحياة: دفعة واحدة، وصول دائم\n\n**API:**\n- Starter: مجاني، 100 طلب/شهر\n- Pro: 29€/شهر، 5000 طلب/شهر\n- Enterprise: حسب الطلب`,
      es: `💳 **Tarificación HireNova**\n\n**Generador de CV:**\n- Gratuito: 3 CVs/mes, marca de agua\n- Pro: 6,99€/mes — CVs ilimitados, cartas, ATS, exportación PDF+Word\n- Anual: 70€/año — Todo Pro + soporte prioritario\n- Lifetime: Pago único, acceso permanente\n\n**API:**\n- Starter: Gratuito, 100 peticiones/mes\n- Pro: 29€/mes, 5000 peticiones/mes\n- Enterprise: Bajo presupuesto`
    }
    return responses[lang]
  }

  // Help / Greetings
  if (/^(bonjour|salut|hello|hi|coucou|aide|help|comment.*marche|que.*peux|مرحب|أهلا|مساعدة|كيف|hola|ayuda|cómo funciona|qué puedes)/.test(q)) {
    const responses: Record<Lang, string> = {
      fr: `Bonjour ! 👋 Je suis l'assistant HireNova. Je peux vous renseigner sur nos 13 modules :\n\n📄 **HireNova IA CV** — génération de CV IA\n🎯 **HireNova IA ATS** — score de compatibilité\n💼 **HireNova IA Jobs** — marketplace d'emplois\n🌍 **HireNova IA Global** — recrutement international\n✈️ **HireNova IA MOBILITY** — adaptation CV par pays\n🔌 **HireNova IA API** — intégration développeur\n🔗 **HireNova IA LinkedIn** — optimisation profil\n🤝 **HireNova IA Recruiter** — matching IA\n🗺️ **HireNova IA Career** — feuille de route professionnelle\n🎓 **HireNova IA Coach** — coach IA\n📚 **HireNova IA Formation** — formation en ligne\n💼 **HireNova IA Freelance** — marketplace freelance\n🎤 **HireNova IA Interview** — simulation d'entretiens\n\nPosez-moi votre question !`,
      en: `Hello! 👋 I'm the HireNova assistant. I can help you with our 13 modules:\n\n📄 **HireNova IA CV** — AI CV generation\n🎯 **HireNova IA ATS** — compatibility score\n💼 **HireNova IA Jobs** — job marketplace\n🌍 **HireNova IA Global** — international recruitment\n✈️ **HireNova IA MOBILITY** — CV adaptation by country\n🔌 **HireNova IA API** — developer integration\n🔗 **HireNova IA LinkedIn** — profile optimization\n🤝 **HireNova IA Recruiter** — AI matching\n🗺️ **HireNova IA Career** — career roadmap\n🎓 **HireNova IA Coach** — AI coach\n📚 **HireNova IA Formation** — online training\n💼 **HireNova IA Freelance** — freelance marketplace\n🎤 **HireNova IA Interview** — interview simulation\n\nAsk me your question!`,
      ar: `مرحباً! 👋 أنا مساعد HireNova. يمكنني مساعدتك حول وحداتنا الـ13:\n\n📄 **HireNova IA CV** — إنشاء سيرة ذاتية بالذكاء الاصطناعي\n🎯 **HireNova IA ATS** — درجة التوافق\n💼 **HireNova IA Jobs** — سوق الوظائف\n🌍 **HireNova IA Global** — التوظيف الدولي\n✈️ **HireNova IA MOBILITY** — تكيف السيرة الذاتية حسب الدولة\n🔌 **HireNova IA API** — تكامل المطورين\n🔗 **HireNova IA LinkedIn** — تحسين الملف الشخصي\n🤝 **HireNova IA Recruiter** — مطابقة الذكاء الاصطناعي\n🗺️ **HireNova IA Career** — خريطة الطريق المهنية\n🎓 **HireNova IA Coach** — مدرب ذكي\n📚 **HireNova IA Formation** — تدريب عبر الإنترنت\n💼 **HireNova IA Freelance** — السوق المستقل\n🎤 **HireNova IA Interview** — محاكاة المقابلات\n\nاسألني سؤالك!`,
      es: `¡Hola! 👋 Soy el asistente de HireNova. Puedo ayudarte con nuestros 13 módulos:\n\n📄 **HireNova IA CV** — Generación de CV con IA\n🎯 **HireNova IA ATS** — Puntuación de compatibilidad\n💼 **HireNova IA Jobs** — Marketplace de empleos\n🌍 **HireNova IA Global** — Reclutamiento internacional\n✈️ **HireNova IA MOBILITY** — Adaptación de CV por país\n🔌 **HireNova IA API** — Integración para desarrolladores\n🔗 **HireNova IA LinkedIn** — Optimización de perfil\n🤝 **HireNova IA Recruiter** — Matching IA\n🗺️ **HireNova IA Career** — Hoja de ruta profesional\n🎓 **HireNova IA Coach** — Coach IA\n📚 **HireNova IA Formation** — Formación online\n💼 **HireNova IA Freelance** — Marketplace freelance\n🎤 **HireNova IA Interview** — Simulación de entrevistas\n\n¡Pregúntame lo que necesites!`
    }
    return responses[lang]
  }

  return null
}

// ─── Fallback Messages ─────────────────────────────────────────────────────
const FALLBACK: Record<Lang, string> = {
  fr: `Je suis l'assistant HireNova. Voici nos 13 modules :\n\n📄 CV • 🎯 ATS • 💼 Jobs • 🌍 Global • ✈️ Mobilité • 🔌 API\n🔗 LinkedIn • 🤝 Recruiter • 🗺️ Career • 🎓 Coach • 📚 Formation • 💼 Freelance • 🎤 Interview\n\nReformulez votre demande sur l'un de ces modules.`,
  en: `I'm the HireNova assistant. Here are our 13 modules:\n\n📄 CV • 🎯 ATS • 💼 Jobs • 🌍 Global • ✈️ Mobility • 🔌 API\n🔗 LinkedIn • 🤝 Recruiter • 🗺️ Career • 🎓 Coach • 📚 Formation • 💼 Freelance • 🎤 Interview\n\nPlease rephrase your question about one of these modules.`,
  ar: `أنا مساعد HireNova. إليك وحداتنا الـ13:\n\n📄 CV • 🎯 ATS • 💼 Jobs • 🌍 Global • ✈️ Mobilité • 🔌 API\n🔗 LinkedIn • 🤝 Recruiter • 🗺️ Career • 🎓 Coach • 📚 Formation • 💼 Freelance • 🎤 Interview\n\nيُرجى إعادة صياغة سؤالك حول إحدى هذه الوحدات.`,
  es: `Soy el asistente de HireNova. Estos son nuestros 13 módulos:\n\n📄 CV • 🎯 ATS • 💼 Jobs • 🌍 Global • ✈️ Mobilité • 🔌 API\n🔗 LinkedIn • 🤝 Recruiter • 🗺️ Career • 🎓 Coach • 📚 Formation • 💼 Freelance • 🎤 Interview\n\nReformula tu pregunta sobre uno de estos módulos.`
}

const ERROR_MSG: Record<Lang, string> = {
  fr: 'Je suis temporairement indisponible. Reformulez votre question sur les modules HireNova.',
  en: 'I\'m temporarily unavailable. Please rephrase your question about HireNova modules.',
  ar: 'أنا غير متاح مؤقتاً. يرجى إعادة صياغة سؤالك حول وحدات HireNova.',
  es: 'Estoy temporalmente no disponible. Reformula tu pregunta sobre los módulos de HireNova.'
}

const INVALID_MSG: Record<Lang, string> = {
  fr: "Je n'ai pas reçu de message valide. Pouvez-vous reformuler ?",
  en: "I didn't receive a valid message. Could you rephrase?",
  ar: 'لم أتلق رسالة صالحة. هل يمكنك إعادة الصياغة؟',
  es: 'No recibí un mensaje válido. ¿Puedes reformular?'
}

// ─── Main API Route ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message = '', mode = 'advisor', conversationHistory = [] } = body

    const safeMode = (['advisor', 'support', 'products'].includes(mode) ? mode : 'advisor') as Mode
    const lang = detectLanguage(message)

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: true, response: INVALID_MSG[lang], lang })
    }

    // 1) Try rule-based answer first (instant, no SDK cost)
    const ruleAnswer = ruleBasedResponse(message, safeMode, lang)
    if (ruleAnswer) {
      return NextResponse.json({ success: true, response: ruleAnswer, source: 'rules', lang })
    }

    // --- HNSA AI Security Gateway (before LLM fallback) ---
    const auth = await withAuth(request)
    const userId = auth.userId || 'anonymous-chatbot'
    const aiCheck = checkAIAbuseLimit(userId)
    if (!aiCheck.allowed) {
      return NextResponse.json(
        { success: true, response: FALLBACK[lang], source: 'fallback', lang },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(aiCheck.retryAfterMs / 1000)) } }
      )
    }

    const secured = secureAIInput(message, userId)
    if (secured.blocked) {
      return NextResponse.json(
        { success: true, response: FALLBACK[lang], source: 'fallback', lang }
      )
    }

    // 2) Fallback to LLM — ZAI SDK first, then OpenAI, then static fallback
    const systemPrompt = KB_PRODUCTS[lang] + MODE_PROMPTS[lang][safeMode]
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-10).map((m: any) => ({ role: m.role as string, content: m.content })),
      { role: 'user' as const, content: message }
    ]

    // 2a) Try ZAI SDK
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const res = await zai.chat.completions.create({
        model: 'deepseek-chat',
        messages: llmMessages,
        temperature: 0.7,
        max_tokens: 800
      })
      const response = res.choices?.[0]?.message?.content?.trim()
      if (response) {
        const outputCheck = validateAIOutput(response, userId)
        if (outputCheck.hasPII) {
          logAIEvent({
            userId, eventType: 'PII_IN_OUTPUT',
            input: message, output: response, blocked: false,
            details: { piiTypes: outputCheck.piiTypes, path: '/api/chatbot' },
          }).catch(() => {})
        }
        return NextResponse.json({ success: true, response, source: 'llm', lang })
      }
    } catch (sdkErr) {
      console.log('[chatbot] ZAI SDK unavailable, trying OpenAI fallback...')
    }

    // 2b) Try OpenAI as fallback (for localhost / non-Z.ai environments)
    try {
      const { callLLM } = await import('@/lib/ai')
      const result = await callLLM(llmMessages as any, { model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 800 })
      if (result) {
        const outputCheck = validateAIOutput(result.text, userId)
        if (outputCheck.hasPII) {
          logAIEvent({
            userId, eventType: 'PII_IN_OUTPUT',
            input: message, output: result.text, blocked: false,
            details: { piiTypes: outputCheck.piiTypes, path: '/api/chatbot' },
          }).catch(() => {})
        }
        return NextResponse.json({ success: true, response: result.text, source: 'openai', lang })
      }
    } catch (openaiErr) {
      console.log('[chatbot] OpenAI fallback unavailable:', openaiErr instanceof Error ? openaiErr.message : String(openaiErr))
    }

    // 3) Final graceful fallback (static KB responses)
    return NextResponse.json({ success: true, response: FALLBACK[lang], source: 'fallback', lang })
  } catch (error) {
    console.error('[chatbot] route error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ success: true, response: ERROR_MSG.fr, lang: 'fr' })
  }
}