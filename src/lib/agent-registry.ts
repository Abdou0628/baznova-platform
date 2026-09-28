// =============================================================================
// HireNova IA — Agent Registry & Orchestration System
// Organigramme Numérique des Agents IA
// CTO Principal coordonne 19 agents spécialisés en 4 langues
// =============================================================================

import type { CVLanguage } from './i18n'

// --- Agent Types ---
export type AgentTier = 'principal' | 'specialized' | 'support'
export type AgentStatus = 'active' | 'idle' | 'processing' | 'collaborating'
export type AgentCategory = 'candidate' | 'employment' | 'platform'

export interface AgentCapability {
  key: string
  label: Record<CVLanguage, string>
}

export interface CollaborationLink {
  agentId: string
  type: 'bidirectional' | 'unidirectional'
  reason: Record<CVLanguage, string>
}

export interface AgentDefinition {
  id: string
  name: string
  module: string
  tier: AgentTier
  category: AgentCategory
  icon: string
  color: string
  capabilities: AgentCapability[]
  collaborations: CollaborationLink[]
  avgResponseTime: string // e.g. "1.2s"
  step: string | null
  description: Record<CVLanguage, string>
}

// --- The 19 Specialized Agents ---
export const AGENTS: AgentDefinition[] = [
  // ==========================================================
  // CANDIDATE LAYER — Individual-Facing Agents
  // ==========================================================
  {
    id: 'cv',
    name: 'Agent CV',
    module: 'HireNova IA CV',
    tier: 'specialized',
    category: 'candidate',
    icon: 'FileText',
    color: 'emerald',
    avgResponseTime: '2.1s',
    step: 'form',
    description: {
      fr: 'Génère des CV professionnels optimisés ATS en 4 langues',
      en: 'Generates ATS-optimized professional CVs in 4 languages',
      ar: 'ينشئ سير ذاتية احترافية متوافقة مع ATS بـ 4 لغات',
      es: 'Genera CVs profesionales optimizados para ATS en 4 idiomas',
    },
    capabilities: [
      { key: 'cv_generate', label: { fr: 'Génération CV', en: 'CV Generation', ar: 'إنشاء السيرة الذاتية', es: 'Generación de CV' } },
      { key: 'cv_templates', label: { fr: '3 Templates', en: '3 Templates', ar: '3 قوالب', es: '3 Plantillas' } },
      { key: 'cv_pdf_word', label: { fr: 'Export PDF/Word', en: 'Export PDF/Word', ar: 'تصدير PDF/Word', es: 'Exportar PDF/Word' } },
      { key: 'cv_multilang', label: { fr: '4 Langues', en: '4 Languages', ar: '4 لغات', es: '4 Idiomas' } },
    ],
    collaborations: [
      { agentId: 'ats', type: 'bidirectional', reason: { fr: 'Optimisation itérative CV↔ATS', en: 'Iterative CV↔ATS optimization', ar: 'تحسين تكراري CV↔ATS', es: 'Optimización iterativa CV↔ATS' } },
      { agentId: 'linkedin', type: 'unidirectional', reason: { fr: 'Données CV → LinkedIn', en: 'CV data → LinkedIn', ar: 'بيانات السيرة → لينكد إن', es: 'Datos CV → LinkedIn' } },
      { agentId: 'career', type: 'unidirectional', reason: { fr: 'Profil → Orientation', en: 'Profile → Career guidance', ar: 'الملف الشخصي → التوجيه', es: 'Perfil → Orientación' } },
    ],
  },
  {
    id: 'ats',
    name: 'Agent ATS',
    module: 'HireNova IA ATS',
    tier: 'specialized',
    category: 'candidate',
    icon: 'Search',
    color: 'emerald',
    avgResponseTime: '1.8s',
    step: 'form',
    description: {
      fr: 'Analyse et score ATS pour maximiser la compatibilité des CV',
      en: 'ATS analysis and scoring to maximize CV compatibility',
      ar: 'تحليل ونتيجة ATS لتعظيم توافق السير الذاتية',
      es: 'Análisis y puntuación ATS para maximizar la compatibilidad del CV',
    },
    capabilities: [
      { key: 'ats_score', label: { fr: 'Scoring ATS', en: 'ATS Scoring', ar: 'نتيجة ATS', es: 'Puntuación ATS' } },
      { key: 'ats_keywords', label: { fr: 'Mots-clés', en: 'Keywords', ar: 'الكلمات المفتاحية', es: 'Palabras clave' } },
      { key: 'ats_suggestions', label: { fr: 'Suggestions IA', en: 'AI Suggestions', ar: 'اقتراحات الذكاء الاصطناعي', es: 'Sugerencias IA' } },
    ],
    collaborations: [
      { agentId: 'cv', type: 'bidirectional', reason: { fr: 'Optimisation itérative ATS↔CV', en: 'Iterative ATS↔CV optimization', ar: 'تحسين تكراري ATS↔CV', es: 'Optimización iterativa ATS↔CV' } },
    ],
  },
  {
    id: 'interview',
    name: 'Agent Interview',
    module: 'HireNova IA INTERVIEW',
    tier: 'specialized',
    category: 'candidate',
    icon: 'MessageCircle',
    color: 'violet',
    avgResponseTime: '3.5s',
    step: 'interview',
    description: {
      fr: 'Simulateur d\'entretiens IA avec feedback en temps réel',
      en: 'AI interview simulator with real-time feedback',
      ar: 'محاكي مقابلات ذكاء اصطناعي مع تغذية راجعة فورية',
      es: 'Simulador de entrevistas IA con retroalimentación en tiempo real',
    },
    capabilities: [
      { key: 'interview_simulate', label: { fr: 'Simulation', en: 'Simulation', ar: 'محاكاة', es: 'Simulación' } },
      { key: 'interview_feedback', label: { fr: 'Feedback IA', en: 'AI Feedback', ar: 'تغذية راجعة', es: 'Retroalimentación' } },
      { key: 'interview_record', label: { fr: 'Enregistrement', en: 'Recording', ar: 'تسجيل', es: 'Grabación' } },
    ],
    collaborations: [
      { agentId: 'coach', type: 'bidirectional', reason: { fr: 'Préparation → Coaching', en: 'Preparation → Coaching', ar: 'التحضير → التدريب', es: 'Preparación → Coaching' } },
      { agentId: 'career', type: 'unidirectional', reason: { fr: 'Résultats → Orientation', en: 'Results → Career guidance', ar: 'النتائج → التوجيه', es: 'Resultados → Orientación' } },
    ],
  },
  {
    id: 'linkedin',
    name: 'Agent LinkedIn',
    module: 'HireNova IA LINKEDIN',
    tier: 'specialized',
    category: 'candidate',
    icon: 'Linkedin',
    color: 'sky',
    avgResponseTime: '2.8s',
    step: 'linkedinHome',
    description: {
      fr: 'Optimisation du profil LinkedIn avec analyse IA',
      en: 'LinkedIn profile optimization with AI analysis',
      ar: 'تحسين ملف لينكد إن مع تحليل ذكاء اصطناعي',
      es: 'Optimización del perfil de LinkedIn con análisis IA',
    },
    capabilities: [
      { key: 'linkedin_analyze', label: { fr: 'Analyse profil', en: 'Profile analysis', ar: 'تحليل الملف', es: 'Análisis de perfil' } },
      { key: 'linkedin_generate', label: { fr: 'Génération contenu', en: 'Content generation', ar: 'إنشاء محتوى', es: 'Generación de contenido' } },
    ],
    collaborations: [
      { agentId: 'cv', type: 'unidirectional', reason: { fr: 'CV → LinkedIn', en: 'CV → LinkedIn', ar: 'CV → لينكد إن', es: 'CV → LinkedIn' } },
      { agentId: 'recruiter', type: 'unidirectional', reason: { fr: 'Profil → Sourcing', en: 'Profile → Sourcing', ar: 'الملف → البحث', es: 'Perfil → Sourcing' } },
    ],
  },
  {
    id: 'career',
    name: 'Agent Career',
    module: 'HireNova IA CAREER',
    tier: 'specialized',
    category: 'candidate',
    icon: 'Compass',
    color: 'rose',
    avgResponseTime: '2.4s',
    step: 'careerHome',
    description: {
      fr: 'Orientation carrière et feuille de route personnalisée',
      en: 'Career guidance and personalized roadmap',
      ar: 'توجيه مهني وخارطة طريق مخصصة',
      es: 'Orientación profesional y hoja de ruta personalizada',
    },
    capabilities: [
      { key: 'career_assess', label: { fr: 'Évaluation', en: 'Assessment', ar: 'تقييم', es: 'Evaluación' } },
      { key: 'career_roadmap', label: { fr: 'Feuille de route', en: 'Roadmap', ar: 'خارطة طريق', es: 'Hoja de ruta' } },
      { key: 'career_skills', label: { fr: 'Analyse compétences', en: 'Skills analysis', ar: 'تحليل المهارات', es: 'Análisis de competencias' } },
    ],
    collaborations: [
      { agentId: 'coach', type: 'bidirectional', reason: { fr: 'Orientation ↔ Coaching', en: 'Guidance ↔ Coaching', ar: 'التوجيه ↔ التدريب', es: 'Orientación ↔ Coaching' } },
      { agentId: 'formation', type: 'bidirectional', reason: { fr: 'Compétences ↔ Formation', en: 'Skills ↔ Training', ar: 'المهارات ↔ التكوين', es: 'Competencias ↔ Formación' } },
      { agentId: 'intelligence', type: 'unidirectional', reason: { fr: 'Données marché → Orientation', en: 'Market data → Guidance', ar: 'بيانات السوق → التوجيه', es: 'Datos del mercado → Orientación' } },
    ],
  },
  {
    id: 'coach',
    name: 'Agent Coach',
    module: 'HireNova IA COACH',
    tier: 'specialized',
    category: 'candidate',
    icon: 'Bot',
    color: 'emerald',
    avgResponseTime: '2.0s',
    step: 'coachHome',
    description: {
      fr: 'Coach carrière IA avec sessions personnalisées et suivi d\'objectifs',
      en: 'AI career coach with personalized sessions and goal tracking',
      ar: 'مدرب مهني بالذكاء الاصطناعي مع جلسات مخصصة وتتبع الأهداف',
      es: 'Coach profesional IA con sesiones personalizadas y seguimiento de objetivos',
    },
    capabilities: [
      { key: 'coach_session', label: { fr: 'Sessions IA', en: 'AI Sessions', ar: 'جلسات ذكاء اصطناعي', es: 'Sesiones IA' } },
      { key: 'coach_goals', label: { fr: 'Suivi objectifs', en: 'Goal tracking', ar: 'تتبع الأهداف', es: 'Seguimiento de objetivos' } },
      { key: 'coach_history', label: { fr: 'Historique', en: 'History', ar: 'السجل', es: 'Historial' } },
    ],
    collaborations: [
      { agentId: 'career', type: 'bidirectional', reason: { fr: 'Coaching ↔ Orientation', en: 'Coaching ↔ Guidance', ar: 'التدريب ↔ التوجيه', es: 'Coaching ↔ Orientación' } },
      { agentId: 'interview', type: 'bidirectional', reason: { fr: 'Coaching ↔ Préparation entretien', en: 'Coaching ↔ Interview prep', ar: 'التدريب ↔ تحضير المقابلة', es: 'Coaching ↔ Preparación entrevista' } },
    ],
  },
  {
    id: 'formation',
    name: 'Agent Formation',
    module: 'HireNova IA FORMATION',
    tier: 'specialized',
    category: 'candidate',
    icon: 'BookOpen',
    color: 'teal',
    avgResponseTime: '1.5s',
    step: 'formationHome',
    description: {
      fr: 'Formation en ligne et certification professionnelle',
      en: 'Online training and professional certification',
      ar: 'تدريب عبر الإنترنت وشهادة مهنية',
      es: 'Formación online y certificación profesional',
    },
    capabilities: [
      { key: 'formation_catalog', label: { fr: 'Catalogue', en: 'Catalog', ar: 'الكتالوج', es: 'Catálogo' } },
      { key: 'formation_course', label: { fr: 'Cours IA', en: 'AI Courses', ar: 'دورات ذكاء اصطناعي', es: 'Cursos IA' } },
      { key: 'formation_cert', label: { fr: 'Certification', en: 'Certification', ar: 'شهادة', es: 'Certificación' } },
    ],
    collaborations: [
      { agentId: 'career', type: 'bidirectional', reason: { fr: 'Formation ↔ Compétences', en: 'Training ↔ Skills', ar: 'التكوين ↔ المهارات', es: 'Formación ↔ Competencias' } },
      { agentId: 'campus', type: 'bidirectional', reason: { fr: 'Formation ↔ Universités', en: 'Training ↔ Universities', ar: 'التكوين ↔ الجامعات', es: 'Formación ↔ Universidades' } },
    ],
  },

  // ==========================================================
  // EMPLOYMENT LAYER — Professional/Enterprise Agents
  // ==========================================================
  {
    id: 'jobs',
    name: 'Agent Jobs',
    module: 'HireNova IA JOBS',
    tier: 'specialized',
    category: 'employment',
    icon: 'Briefcase',
    color: 'emerald',
    avgResponseTime: '1.2s',
    step: 'jobMarket',
    description: {
      fr: 'Marketplace d\'emplois avec IA matching candidat-poste',
      en: 'Job marketplace with AI candidate-position matching',
      ar: 'سوق عمل مع مطابقة ذكية بين المرشح والوظيفة',
      es: 'Marketplace de empleos con matching IA candidato-posición',
    },
    capabilities: [
      { key: 'jobs_browse', label: { fr: 'Parcourir offres', en: 'Browse jobs', ar: 'تصفح العروض', es: 'Explorar ofertas' } },
      { key: 'jobs_apply', label: { fr: 'Candidature IA', en: 'AI application', ar: 'تقدم بذكاء اصطناعي', es: 'Aplicación IA' } },
      { key: 'jobs_post', label: { fr: 'Publier offre', en: 'Post job', ar: 'نشر عرض', es: 'Publicar oferta' } },
      { key: 'jobs_match', label: { fr: 'Matching IA', en: 'AI Matching', ar: 'مطابقة ذكية', es: 'Matching IA' } },
    ],
    collaborations: [
      { agentId: 'recruiter', type: 'bidirectional', reason: { fr: 'Offres ↔ Pipeline', en: 'Jobs ↔ Pipeline', ar: 'العروض ↔ خط الأنابيب', es: 'Ofertas ↔ Pipeline' } },
      { agentId: 'cv', type: 'unidirectional', reason: { fr: 'CV → Candidature', en: 'CV → Application', ar: 'CV → التقدم', es: 'CV → Aplicación' } },
    ],
  },
  {
    id: 'recruiter',
    name: 'Agent Recruiter',
    module: 'HireNova IA RECRUITER',
    tier: 'specialized',
    category: 'employment',
    icon: 'UserCheck',
    color: 'amber',
    avgResponseTime: '1.9s',
    step: 'recruiterHome',
    description: {
      fr: 'Pipeline de recrutement IA avec scoring et matching candidats',
      en: 'AI recruitment pipeline with candidate scoring and matching',
      ar: 'خط أنابيب توظيف ذكي مع تسجيل ومطابقة المرشحين',
      es: 'Pipeline de reclutamiento IA con puntuación y matching de candidatos',
    },
    capabilities: [
      { key: 'recruiter_pipeline', label: { fr: 'Pipeline', en: 'Pipeline', ar: 'خط الأنابيب', es: 'Pipeline' } },
      { key: 'recruiter_candidates', label: { fr: 'Gestion candidats', en: 'Candidate management', ar: 'إدارة المرشحين', es: 'Gestión de candidatos' } },
      { key: 'recruiter_match', label: { fr: 'Matching IA', en: 'AI Matching', ar: 'مطابقة ذكية', es: 'Matching IA' } },
    ],
    collaborations: [
      { agentId: 'jobs', type: 'bidirectional', reason: { fr: 'Pipeline ↔ Offres', en: 'Pipeline ↔ Jobs', ar: 'خط الأنابيب ↔ العروض', es: 'Pipeline ↔ Ofertas' } },
      { agentId: 'linkedin', type: 'unidirectional', reason: { fr: 'Profil LinkedIn → Sourcing', en: 'LinkedIn profile → Sourcing', ar: 'ملف لينكد إن → البحث', es: 'Perfil LinkedIn → Sourcing' } },
      { agentId: 'interview', type: 'unidirectional', reason: { fr: 'Candidat → Simulation entretien', en: 'Candidate → Interview sim', ar: 'المرشح → محاكاة مقابلة', es: 'Candidato → Simulación entrevista' } },
    ],
  },
  {
    id: 'freelance',
    name: 'Agent Freelance',
    module: 'HireNova IA FREELANCE',
    tier: 'specialized',
    category: 'employment',
    icon: 'Laptop',
    color: 'orange',
    avgResponseTime: '1.6s',
    step: 'freelanceHome',
    description: {
      fr: 'Marketplace freelance avec missions et tableau de bord',
      en: 'Freelance marketplace with missions and dashboard',
      ar: 'سوق عمل حر مع مهام ولوحة تحكم',
      es: 'Marketplace freelance con misiones y panel de control',
    },
    capabilities: [
      { key: 'freelance_browse', label: { fr: 'Parcourir missions', en: 'Browse missions', ar: 'تصفح المهام', es: 'Explorar misiones' } },
      { key: 'freelance_proposal', label: { fr: 'Proposition IA', en: 'AI Proposal', ar: 'اقتراح ذكي', es: 'Propuesta IA' } },
      { key: 'freelance_dashboard', label: { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة التحكم', es: 'Panel de control' } },
    ],
    collaborations: [
      { agentId: 'marketplace', type: 'bidirectional', reason: { fr: 'Missions ↔ Communauté', en: 'Missions ↔ Community', ar: 'المهام ↔ المجتمع', es: 'Misiones ↔ Comunidad' } },
      { agentId: 'legal', type: 'unidirectional', reason: { fr: 'Contrats freelance', en: 'Freelance contracts', ar: 'عقود العمل الحر', es: 'Contratos freelance' } },
    ],
  },
  {
    id: 'global',
    name: 'Agent Global',
    module: 'HireNova IA GLOBAL',
    tier: 'specialized',
    category: 'employment',
    icon: 'Globe',
    color: 'teal',
    avgResponseTime: '2.2s',
    step: 'globalMarket',
    description: {
      fr: 'Recrutement international avec adaptation multiculturelle',
      en: 'International recruitment with multicultural adaptation',
      ar: 'توظيف دولي مع تكييف متعدد الثقافات',
      es: 'Reclutamiento internacional con adaptación multicultural',
    },
    capabilities: [
      { key: 'global_market', label: { fr: 'Marché mondial', en: 'Global market', ar: 'السوق العالمي', es: 'Mercado global' } },
      { key: 'global_apply', label: { fr: 'Candidature intl', en: 'Intl application', ar: 'تقدم دولي', es: 'Aplicación intl' } },
      { key: 'global_employer', label: { fr: 'Dashboard employeur', en: 'Employer dashboard', ar: 'لوحة صاحب العمل', es: 'Panel empleador' } },
    ],
    collaborations: [
      { agentId: 'mobility', type: 'bidirectional', reason: { fr: 'Recrutement ↔ Mobilité', en: 'Recruitment ↔ Mobility', ar: 'التوظيف ↔ التنقل', es: 'Reclutamiento ↔ Movilidad' } },
      { agentId: 'legal', type: 'unidirectional', reason: { fr: 'Conformité intl', en: 'Intl compliance', ar: 'الامتثال الدولي', es: 'Cumplimiento intl' } },
    ],
  },

  // ==========================================================
  // PLATFORM LAYER — System & Infrastructure Agents
  // ==========================================================
  {
    id: 'api',
    name: 'Agent API',
    module: 'HireNova IA API',
    tier: 'specialized',
    category: 'platform',
    icon: 'Code2',
    color: 'sky',
    avgResponseTime: '0.8s',
    step: 'apiDocs',
    description: {
      fr: 'Portail API pour intégrations tierces et automatisation',
      en: 'API portal for third-party integrations and automation',
      ar: 'بوابة API للتكاملات الخارجية والأتمتة',
      es: 'Portal API para integraciones de terceros y automatización',
    },
    capabilities: [
      { key: 'api_docs', label: { fr: 'Documentation', en: 'Documentation', ar: 'التوثيق', es: 'Documentación' } },
      { key: 'api_keys', label: { fr: 'Clés API', en: 'API Keys', ar: 'مفاتيح API', es: 'Claves API' } },
      { key: 'api_dashboard', label: { fr: 'Dashboard API', en: 'API Dashboard', ar: 'لوحة API', es: 'Panel API' } },
    ],
    collaborations: [
      { agentId: 'whiteLabel', type: 'unidirectional', reason: { fr: 'API → White Label', en: 'API → White Label', ar: 'API → العلامة البيضاء', es: 'API → White Label' } },
    ],
  },
  {
    id: 'intelligence',
    name: 'Agent Intelligence',
    module: 'HireNova IA INTELLIGENCE',
    tier: 'specialized',
    category: 'platform',
    icon: 'Brain',
    color: 'violet',
    avgResponseTime: '1.4s',
    step: 'intelligenceHome',
    description: {
      fr: 'Intelligence de marché, tendances salariales et prévisions RH',
      en: 'Market intelligence, salary trends and HR forecasting',
      ar: 'ذكاء السوق واتجاهات الرواتب والتوقعات الموارد البشرية',
      es: 'Inteligencia de mercado, tendencias salariales y previsiones RRHH',
    },
    capabilities: [
      { key: 'intel_trends', label: { fr: 'Tendances', en: 'Trends', ar: 'الاتجاهات', es: 'Tendencias' } },
      { key: 'intel_salary', label: { fr: 'Salaires', en: 'Salaries', ar: 'الرواتب', es: 'Salarios' } },
      { key: 'intel_forecast', label: { fr: 'Prévisions', en: 'Forecasts', ar: 'التوقعات', es: 'Previsiones' } },
    ],
    collaborations: [
      // Intelligence feeds data TO all agents — this is the data hub
      { agentId: 'career', type: 'unidirectional', reason: { fr: 'Données → Orientation', en: 'Data → Guidance', ar: 'بيانات → التوجيه', es: 'Datos → Orientación' } },
      { agentId: 'recruiter', type: 'unidirectional', reason: { fr: 'Données → Sourcing', en: 'Data → Sourcing', ar: 'بيانات → البحث', es: 'Datos → Sourcing' } },
      { agentId: 'formation', type: 'unidirectional', reason: { fr: 'Données → Formation', en: 'Data → Training', ar: 'بيانات → التكوين', es: 'Datos → Formación' } },
      { agentId: 'jobs', type: 'unidirectional', reason: { fr: 'Données → Offres', en: 'Data → Jobs', ar: 'بيانات → العروض', es: 'Datos → Ofertas' } },
    ],
  },
  {
    id: 'mobility',
    name: 'Agent Mobility',
    module: 'HireNova IA MOBILITY',
    tier: 'specialized',
    category: 'platform',
    icon: 'Plane',
    color: 'purple',
    avgResponseTime: '3.2s',
    step: 'mobilityHome',
    description: {
      fr: 'Mobilité internationale avec OCR et adaptation CV par pays',
      en: 'International mobility with OCR and country-specific CV adaptation',
      ar: 'التنقل الدولي مع OCR وتكييف السيرة الذاتية حسب البلد',
      es: 'Movilidad internacional con OCR y adaptación de CV por país',
    },
    capabilities: [
      { key: 'mobility_ocr', label: { fr: 'OCR document', en: 'OCR document', ar: 'OCR مستند', es: 'OCR documento' } },
      { key: 'mobility_adapt', label: { fr: 'Adaptation pays', en: 'Country adaptation', ar: 'تكييف البلد', es: 'Adaptación país' } },
      { key: 'mobility_profile', label: { fr: 'Profil mobilité', en: 'Mobility profile', ar: 'ملف التنقل', es: 'Perfil movilidad' } },
    ],
    collaborations: [
      { agentId: 'global', type: 'bidirectional', reason: { fr: 'Mobilité ↔ Recrutement intl', en: 'Mobility ↔ Intl recruitment', ar: 'التنقل ↔ التوظيف الدولي', es: 'Movilidad ↔ Reclutamiento intl' } },
      { agentId: 'cv', type: 'unidirectional', reason: { fr: 'CV → Adaptation', en: 'CV → Adaptation', ar: 'CV → التكييف', es: 'CV → Adaptación' } },
    ],
  },
  {
    id: 'chatbot',
    name: 'Agent Chatbot',
    module: 'HireNova IA CHAT BOT ADVANCED',
    tier: 'specialized',
    category: 'platform',
    icon: 'MessageSquare',
    color: 'violet',
    avgResponseTime: '1.0s',
    step: null,
    description: {
      fr: 'Chatbot avancé 3 volets: Conseil, Support, Produits en 4 langues',
      en: 'Advanced 3-volet chatbot: Advisory, Support, Products in 4 languages',
      ar: 'دردشة متقدمة 3 أقسام: استشارات، دعم، منتجات بـ 4 لغات',
      es: 'Chatbot avanzado 3 secciones: Asesoría, Soporte, Productos en 4 idiomas',
    },
    capabilities: [
      { key: 'chat_advisory', label: { fr: 'Volet Conseil', en: 'Advisory', ar: 'قسم الاستشارات', es: 'Asesoría' } },
      { key: 'chat_support', label: { fr: 'Volet Support', en: 'Support', ar: 'قسم الدعم', es: 'Soporte' } },
      { key: 'chat_products', label: { fr: 'Volet Produits', en: 'Products', ar: 'قسم المنتجات', es: 'Productos' } },
    ],
    collaborations: [], // Chatbot is the universal interface — it routes to all agents
  },
  {
    id: 'campus',
    name: 'Agent Campus',
    module: 'HireNova IA CAMPUS SaaS',
    tier: 'specialized',
    category: 'platform',
    icon: 'GraduationCap',
    color: 'teal',
    avgResponseTime: '1.3s',
    step: 'campus',
    description: {
      fr: 'Campus SaaS pour universités partenaires et ateliers étudiants',
      en: 'SaaS campus for partner universities and student workshops',
      ar: 'حرم سحابي للجامعات الشريكة وورش الطلاب',
      es: 'Campus SaaS para universidades asociadas y talleres estudiantiles',
    },
    capabilities: [
      { key: 'campus_universities', label: { fr: 'Universités', en: 'Universities', ar: 'الجامعات', es: 'Universidades' } },
      { key: 'campus_workshops', label: { fr: 'Ateliers', en: 'Workshops', ar: 'الورش', es: 'Talleres' } },
    ],
    collaborations: [
      { agentId: 'formation', type: 'bidirectional', reason: { fr: 'Campus ↔ Formation', en: 'Campus ↔ Training', ar: 'الحرم ↔ التكوين', es: 'Campus ↔ Formación' } },
    ],
  },
  {
    id: 'marketplace',
    name: 'Agent Community',
    module: 'HireNova IA COMMUNITY ET MARKETPLACE',
    tier: 'specialized',
    category: 'platform',
    icon: 'Store',
    color: 'emerald',
    avgResponseTime: '1.1s',
    step: 'marketplaceHome',
    description: {
      fr: 'Commauté professionnelle et marketplace de services RH',
      en: 'Professional community and HR services marketplace',
      ar: 'مجتمع مهني وسوق خدمات الموارد البشرية',
      es: 'Comunidad profesional y marketplace de servicios RRHH',
    },
    capabilities: [
      { key: 'marketplace_community', label: { fr: 'Communauté', en: 'Community', ar: 'المجتمع', es: 'Comunidad' } },
      { key: 'marketplace_events', label: { fr: 'Événements', en: 'Events', ar: 'الفعاليات', es: 'Eventos' } },
      { key: 'marketplace_profile', label: { fr: 'Profil pro', en: 'Pro profile', ar: 'الملف المهني', es: 'Perfil pro' } },
    ],
    collaborations: [
      { agentId: 'freelance', type: 'bidirectional', reason: { fr: 'Communauté ↔ Missions', en: 'Community ↔ Missions', ar: 'المجتمع ↔ المهام', es: 'Comunidad ↔ Misiones' } },
    ],
  },
  {
    id: 'whiteLabel',
    name: 'Agent White Label',
    module: 'HireNova IA WHITE LABEL',
    tier: 'specialized',
    category: 'platform',
    icon: 'Building2',
    color: 'slate',
    avgResponseTime: '2.5s',
    step: 'whiteLabelHome',
    description: {
      fr: 'Solution white-label complète pour personnaliser la plateforme',
      en: 'Complete white-label solution to customize the platform',
      ar: 'حل العلامة البيضاء الكامل لتخصيص المنصة',
      es: 'Solución white-label completa para personalizar la plataforma',
    },
    capabilities: [
      { key: 'wl_setup', label: { fr: 'Configuration', en: 'Setup', ar: 'الإعداد', es: 'Configuración' } },
      { key: 'wl_dashboard', label: { fr: 'Dashboard', en: 'Dashboard', ar: 'لوحة التحكم', es: 'Panel de control' } },
      { key: 'wl_pricing', label: { fr: 'Tarification', en: 'Pricing', ar: 'التسعير', es: 'Tarificación' } },
    ],
    collaborations: [
      { agentId: 'api', type: 'unidirectional', reason: { fr: 'API → White Label', en: 'API → White Label', ar: 'API → العلامة البيضاء', es: 'API → White Label' } },
    ],
  },
  {
    id: 'legal',
    name: 'Agent Legal',
    module: 'HireNova IA LEGAL',
    tier: 'specialized',
    category: 'platform',
    icon: 'Scale',
    color: 'red',
    avgResponseTime: '2.7s',
    step: 'legalHome',
    description: {
      fr: 'Génération de contrats, conformité RGPD et vérification légale',
      en: 'Contract generation, GDPR compliance and legal verification',
      ar: 'إنشاء العقود والامتثال للائحة GDPR والتحقق القانوني',
      es: 'Generación de contratos, cumplimiento RGPD y verificación legal',
    },
    capabilities: [
      { key: 'legal_contracts', label: { fr: 'Contrats', en: 'Contracts', ar: 'العقود', es: 'Contratos' } },
      { key: 'legal_compliance', label: { fr: 'Conformité', en: 'Compliance', ar: 'الامتثال', es: 'Cumplimiento' } },
      { key: 'legal_templates', label: { fr: 'Templates', en: 'Templates', ar: 'القوالب', es: 'Plantillas' } },
    ],
    collaborations: [
      { agentId: 'freelance', type: 'unidirectional', reason: { fr: 'Contrats → Freelance', en: 'Contracts → Freelance', ar: 'العقود → العمل الحر', es: 'Contratos → Freelance' } },
      { agentId: 'global', type: 'unidirectional', reason: { fr: 'Conformité intl', en: 'Intl compliance', ar: 'الامتثال الدولي', es: 'Cumplimiento intl' } },
      { agentId: 'whiteLabel', type: 'unidirectional', reason: { fr: 'Cadre légal → White Label', en: 'Legal framework → White Label', ar: 'الإطار القانوني → العلامة البيضاء', es: 'Marco legal → White Label' } },
    ],
  },
  // ==========================================================
  // PLATFORM LAYER — Payment & Accounting Agent
  // ==========================================================
  {
    id: 'payment',
    name: 'Agent Paiement',
    module: 'HireNova IA Paiement',
    tier: 'specialized',
    category: 'platform',
    icon: 'CreditCard',
    color: 'violet',
    avgResponseTime: '0.8s',
    step: 'paymentDashboard',
    description: {
      fr: 'Gestion des paiements, abonnements, factures et fiscalité marocaine',
      en: 'Payment management, subscriptions, invoicing and Moroccan tax system',
      ar: 'إدارة المدفوعات والاشتراكات والفواتير والنظام الضريبي المغربي',
      es: 'Gestión de pagos, suscripciones, facturación y sistema fiscal marroquí',
    },
    capabilities: [
      { key: 'stripe_checkout', label: { fr: 'Paiement Stripe', en: 'Stripe Checkout', ar: 'دفع سترايب', es: 'Pago Stripe' } },
      { key: 'stripe_portal', label: { fr: 'Portail Stripe', en: 'Stripe Portal', ar: 'بوابة سترايب', es: 'Portal Stripe' } },
      { key: 'subscriptions', label: { fr: 'Abonnements payants', en: 'Paid Subscriptions', ar: 'اشتراكات مدفوعة', es: 'Suscripciones de pago' } },
      { key: 'invoices', label: { fr: 'Facturation', en: 'Invoicing', ar: 'فوترة', es: 'Facturación' } },
      { key: 'tax_ma', label: { fr: 'Fiscalité MAROC (IS 30%)', en: 'Moroccan Tax (IS 30%)', ar: 'الضرائب المغربية (30%)', es: 'Impuestos Marruecos (IS 30%)' } },
      { key: 'tax_calc', label: { fr: 'Calculateur IS/TVA', en: 'IS/VAT Calculator', ar: 'حاسبة الضريبة', es: 'Calculadora IS/IVA' } },
      { key: 'mrr', label: { fr: 'Suivi MRR', en: 'MRR Tracking', ar: 'تتبع الإيرادات', es: 'Seguimiento MRR' } },
      { key: 'multi_provider', label: { fr: 'Multi-fournisseurs', en: 'Multi-Provider', ar: 'مزودون متعددون', es: 'Multi-Proveedor' } },
    ],
    collaborations: [
      { agentId: 'cv', type: 'unidirectional', reason: { fr: 'Accès CV selon abonnement', en: 'CV access based on subscription', ar: 'الوصول للسيرة حسب الاشتراك', es: 'Acceso CV según suscripción' } },
    ],
  },
]

// --- CTO Principal Definition ---
export const CTO_PRINCIPAL = {
  id: 'cto-principal',
  name: 'CTO Principal',
  tier: 'principal' as AgentTier,
  description: {
    fr: 'Orchestrateur Général — Classifie, route et supervise l\'intervention de tous les agents spécialisés',
    en: 'General Orchestrator — Classifies, routes and supervises all specialized agent interventions',
    ar: 'المنسق العام — يصنف ويوجه ويشرف على تدخل جميع الوكلاء المتخصصين',
    es: 'Orquestador General — Clasifica, enruta y supervisa todas las intervenciones de agentes especializados',
  },
}

// --- Helper Functions ---
export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENTS.find(a => a.id === id)
}

export function getAgentsByCategory(category: AgentCategory): AgentDefinition[] {
  return AGENTS.filter(a => a.category === category)
}

export function getAgentCollaborations(agentId: string): CollaborationLink[] {
  const agent = getAgentById(agentId)
  return agent?.collaborations ?? []
}

export function getCategoryLabel(category: AgentCategory, lang: CVLanguage): string {
  const labels: Record<AgentCategory, Record<CVLanguage, string>> = {
    candidate: { fr: 'Couche Candidat', en: 'Candidate Layer', ar: 'طبقة المرشح', es: 'Capa Candidato' },
    employment: { fr: 'Couche Emploi', en: 'Employment Layer', ar: 'طبقة التوظيف', es: 'Capa Empleo' },
    platform: { fr: 'Couche Plateforme', en: 'Platform Layer', ar: 'طبقة المنصة', es: 'Capa Plataforma' },
  }
  return labels[category][lang]
}

// --- Dispatch Result Types ---
export interface DispatchResult {
  requestId: string
  timestamp: string
  userLanguage: CVLanguage
  classifiedIntent: string
  primaryAgent: AgentDefinition
  secondaryAgents: AgentDefinition[]
  collaborationMode: 'solo' | 'sequential' | 'parallel'
  estimatedTime: string
  response: string
}

// --- Category color mapping ---
export const CATEGORY_COLORS: Record<AgentCategory, string> = {
  candidate: 'emerald',
  employment: 'amber',
  platform: 'violet',
}

export const CATEGORY_BG: Record<AgentCategory, string> = {
  candidate: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
  employment: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  platform: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800',
}
