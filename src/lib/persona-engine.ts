// =============================================================================
// HireNova IA — Persona Engine (Marketing Expert Perspective)
// Chaque persona a un parcours complet: CV → LM auto → ATS → Suggestions → Candidature
// Philosophie: Égalité des chances, zéro discrimination, référence mondiale
// =============================================================================

import type { CVLanguage, PersonaType } from '@/lib/i18n'

// --- Persona Metadata (Marketing-Grade Definitions) ---
export interface PersonaFieldDef {
  key: string
  labelKey: string
  placeholderKey: string
  required: boolean
  type: 'text' | 'textarea' | 'select' | 'date'
  options?: { value: string; labelKey: string }[]
}

export interface PersonaSuggestion {
  category: 'cv' | 'cl' | 'ats' | 'career' | 'interview'
  key: string
  label: Record<CVLanguage, string>
  description: Record<CVLanguage, string>
  priority: 'high' | 'medium' | 'low'
}

export interface PersonaConfig {
  id: PersonaType
  emoji: string
  icon: string
  // Marketing
  tagline: Record<CVLanguage, string>
  valueProp: Record<CVLanguage, string>
  socialProof: Record<CVLanguage, string>
  // Form behavior
  defaultTone: 'formal' | 'semi-formal' | 'dynamic'
  showApplicationType: boolean
  applicationTypes: { value: string; labelKey: string }[]
  extraFields: PersonaFieldDef[]
  // Auto-link behavior
  autoGenerateCL: boolean
  clToneOverride?: 'formal' | 'semi-formal' | 'dynamic'
  autoProposeATS: boolean
  // ATS focus areas
  atsFocusKeywords: string[]
  // Suggestions engine
  suggestions: PersonaSuggestion[]
  // Job application adaptations
  applicationFields: PersonaFieldDef[]
  applicationIntro: Record<CVLanguage, string>
}

// =============================================================================
// COMPLETE PERSONA CONFIGURATIONS
// =============================================================================

export const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  // =========================================================================
  // ÉTUDIANT — First job seeker, internship, equal opportunity access
  // =========================================================================
  student: {
    id: 'student',
    emoji: '\uD83C\uDF93',
    icon: 'GraduationCap',
    tagline: {
      fr: 'Ton premier pas vers la carrière — sans discrimination',
      en: 'Your first step into your career — discrimination-free',
      ar: 'خطوتك الأولى نحو المسار المهني — بدون تمييز',
      es: 'Tu primer paso hacia la carrera — sin discriminación',
    },
    valueProp: {
      fr: 'HireNova donne à chaque étudiant la même chance de décrocher un stage ou un premier emploi grâce à un CV optimisé qui met en valeur tes projets académiques, tes compétences et ton potentiel — pas ton manque d\'expérience.',
      en: 'HireNova gives every student an equal chance to land an internship or first job with an optimized CV that highlights your academic projects, skills, and potential — not your lack of experience.',
      ar: 'يمنح HireNova كل طالب فرصة متساوية للحصول على تدريب أو وظيفة أولى من خلال سيرة ذاتية محسنة تبرز مشاريعك الأكاديمية ومهاراتك وإمكاناتك — وليس نقص خبرتك.',
      es: 'HireNova da a cada estudiante la misma oportunidad de conseguir una pasantía o primer empleo con un CV optimizado que destaca tus proyectos académicos, habilidades y potencial — no tu falta de experiencia.',
    },
    socialProof: {
      fr: '+12 000 étudiants ont déjà décroché leur premier stage avec HireNova',
      en: '+12,000 students already landed their first internship with HireNova',
      ar: '+12,000 طالب حصلوا بالفعل على أول تدريب لهم مع HireNova',
      es: '+12,000 estudiantes ya consiguieron su primera pasantía con HireNova',
    },
    defaultTone: 'semi-formal',
    showApplicationType: true,
    applicationTypes: [
      { value: 'internship', labelKey: 'appTypeInternship' },
      { value: 'first_job', labelKey: 'appTypeFirstJob' },
      { value: 'student_job', labelKey: 'appTypeStudentJob' },
    ],
    extraFields: [
      { key: 'school', labelKey: 'pfStudentField1', placeholderKey: 'pfStudentField1Ph', required: true, type: 'text' },
      { key: 'major', labelKey: 'pfStudentField2', placeholderKey: 'pfStudentField2Ph', required: true, type: 'text' },
      { key: 'graduationDate', labelKey: 'pfStudentField3', placeholderKey: 'pfStudentField3Ph', required: true, type: 'date' },
      { key: 'gpa', labelKey: 'pfStudentGpa', placeholderKey: 'pfStudentGpaPh', required: false, type: 'text' },
    ],
    autoGenerateCL: true,
    clToneOverride: 'semi-formal',
    autoProposeATS: true,
    atsFocusKeywords: ['stage', 'internship', 'projet académique', 'academic project', 'bénévolat', 'volunteer', 'association', 'club étudiant', 'compétences transférables', 'motivation', 'apprentissage'],
    suggestions: [
      { category: 'cv', key: 'student_projects', label: { fr: 'Mets en avant tes projets', en: 'Highlight your projects', ar: 'أبرز مشاريعك', es: 'Destaca tus proyectos' }, description: { fr: 'Les recruteurs cherchent des projets concrets — pas seulement des diplômes. Décris 2-3 projets académiques avec tes rôles et résultats.', en: 'Recruiters look for concrete projects — not just degrees. Describe 2-3 academic projects with your roles and results.', ar: 'يبحث المسؤولون عن مشاريع ملموسة — وليس فقط شهادات. صف 2-3 مشاريع أكاديمية مع أدوارك ونتائجك.', es: 'Los reclutadores buscan proyectos concretos — no solo títulos. Describe 2-3 proyectos académicos con tus roles y resultados.' }, priority: 'high' },
      { category: 'cl', key: 'student_motivation', label: { fr: 'Lettre de motivation ciblée', en: 'Targeted cover letter', ar: 'رسالة تحفيزية مستهدفة', es: 'Carta de motivación dirigida' }, description: { fr: 'Explique pourquoi TU — parmi tous les candidats — es le meilleur choix. Personnalise pour chaque entreprise.', en: 'Explain why YOU — among all candidates — are the best choice. Personalize for each company.', ar: 'اشرح لماذا أنت — من بين جميع المرشحين — الخيار الأفضل. خصص لكل شركة.', es: 'Explica por qué TÚ — entre todos los candidatos — eres la mejor opción. Personaliza para cada empresa.' }, priority: 'high' },
      { category: 'ats', key: 'student_keywords', label: { fr: 'Mots-clés du poste cible', en: 'Target job keywords', ar: 'الكلمات المفتاحية للوظيفة المستهدفة', es: 'Palabras clave del puesto objetivo' }, description: { fr: 'Copie-colle l\'offre d\'emploi dans l\'analyseur ATS — HireNova extrait les mots-clés et vérifie ton CV.', en: 'Paste the job posting into the ATS analyzer — HireNova extracts keywords and checks your CV.', ar: 'الصق إعلان الوظيفة في محلل ATS — يستخرج HireNova الكلمات المفتاحية ويتحقق من سيرتك الذاتية.', es: 'Pega la oferta de empleo en el analizador ATS — HireNova extrae palabras clave y verifica tu CV.' }, priority: 'high' },
      { category: 'career', key: 'student_linkedin', label: { fr: 'Optimise ton LinkedIn', en: 'Optimize your LinkedIn', ar: 'حسّن ملفك على لينكد إن', es: 'Optimiza tu LinkedIn' }, description: { fr: 'Un profil LinkedIn complet multiplie par 3 tes chances d\'être contacté par un recruteur.', en: 'A complete LinkedIn profile triples your chances of being contacted by a recruiter.', ar: 'ملف لينكد إن كامل يضاعف 3 مرات فرص تواصلك مع مسؤول توظيف.', es: 'Un perfil de LinkedIn completo triplica tus posibilidades de ser contactado por un reclutador.' }, priority: 'medium' },
      { category: 'interview', key: 'student_practice', label: { fr: 'Pratique l\'entretien IA', en: 'Practice AI interview', ar: 'تدرب على المقابلة بالذكاء الاصطناعي', es: 'Practica entrevista IA' }, description: { fr: 'Le simulateur d\'entretien IA te prépare aux questions fréquentes pour les profils juniors.', en: 'The AI interview simulator prepares you for common junior-level interview questions.', ar: 'يحضرك محاكي المقابلة بالذكاء الاصطناعي للأسئلة الشائعة للمستوى المبتدئ.', es: 'El simulador de entrevistas IA te prepara para preguntas comunes de nivel junior.' }, priority: 'medium' },
    ],
    applicationFields: [
      { key: 'school', labelKey: 'appFieldSchool', placeholderKey: 'appFieldSchoolPh', required: true, type: 'text' },
      { key: 'major', labelKey: 'appFieldMajor', placeholderKey: 'appFieldMajorPh', required: true, type: 'text' },
      { key: 'graduationDate', labelKey: 'appFieldGradDate', placeholderKey: 'appFieldGradDatePh', required: true, type: 'date' },
      { key: 'availability', labelKey: 'appFieldAvailability', placeholderKey: 'appFieldAvailabilityPh', required: true, type: 'select', options: [{ value: 'immediate', labelKey: 'appAvailImmediate' }, { value: '1month', labelKey: 'appAvail1Month' }, { value: '3months', labelKey: 'appAvail3Months' }, { value: '6months', labelKey: 'appAvail6Months' }] },
      { key: 'motivation', labelKey: 'appFieldMotivation', placeholderKey: 'appFieldMotivationPh', required: true, type: 'textarea' },
    ],
    applicationIntro: {
      fr: 'Postulez avec votre profil étudiant — mettez en avant votre potentiel et vos projets académiques.',
      en: 'Apply with your student profile — highlight your potential and academic projects.',
      ar: 'قدّم بملفك الطالب — أبرز إمكاناتك ومشاريعك الأكاديمية.',
      es: 'Aplica con tu perfil estudiantil — destaca tu potencial y proyectos académicos.',
    },
  },

  // =========================================================================
  // JEUNE DIPLÔMÉ — Recent graduate, first professional experience
  // =========================================================================
  graduate: {
    id: 'graduate',
    emoji: '\uD83C\uDF1F',
    icon: 'Award',
    tagline: {
      fr: 'Ton diplôme mérite un CV qui le valorise',
      en: 'Your degree deserves a CV that values it',
      ar: 'شهادتك تستحق سيرة ذاتية تقدرها',
      es: 'Tu título merece un CV que lo valore',
    },
    valueProp: {
      fr: 'Fais la transition de l\'université à l\'entreprise avec un CV qui transforme tes connaissances académiques en compétences professionnelles concrètes. HireNova IA connaît les attentes des recruteurs pour les jeunes diplômés.',
      en: 'Make the transition from university to the corporate world with a CV that transforms academic knowledge into concrete professional skills. HireNova IA knows recruiter expectations for recent graduates.',
      ar: 'انتقل من الجامعة إلى عالم الشركات بسيرة ذاتية تحول معرفتك الأكاديمية إلى مهارات مهنية ملموسة.',
      es: 'Haz la transición de la universidad al mundo corporativo con un CV que transforma el conocimiento académico en habilidades profesionales concretas.',
    },
    socialProof: {
      fr: '+8 500 jeunes diplômés ont trouvé leur premier emploi en < 30 jours',
      en: '+8,500 recent graduates found their first job in < 30 days',
      ar: '+8,500 خريج جديد وجدوا أول وظيفة لهم في أقل من 30 يومًا',
      es: '+8,500 recién graduados encontraron su primer empleo en < 30 días',
    },
    defaultTone: 'semi-formal',
    showApplicationType: true,
    applicationTypes: [
      { value: 'first_job', labelKey: 'appTypeFirstJob' },
      { value: 'graduate_program', labelKey: 'appTypeGradProgram' },
      { value: 'apprenticeship', labelKey: 'appTypeApprenticeship' },
    ],
    extraFields: [
      { key: 'degree', labelKey: 'pfGraduateField1', placeholderKey: 'pfGraduateField1Ph', required: true, type: 'text' },
      { key: 'school', labelKey: 'pfGraduateField2', placeholderKey: 'pfGraduateField2Ph', required: true, type: 'text' },
      { key: 'graduationYear', labelKey: 'pfGraduateField3', placeholderKey: 'pfGraduateField3Ph', required: true, type: 'date' },
    ],
    autoGenerateCL: true,
    clToneOverride: 'semi-formal',
    autoProposeATS: true,
    atsFocusKeywords: ['diplôme', 'degree', 'certification', 'projet de fin d\'études', 'thesis', 'stage', 'internship', 'compétences techniques', 'technical skills', 'formation', 'training'],
    suggestions: [
      { category: 'cv', key: 'grad_translate', label: { fr: 'Traduis ton académique en professionnel', en: 'Translate academic to professional', ar: 'حوّل أكاديميك إلى مهني', es: 'Traduce académico a profesional' }, description: { fr: 'Remplace \"j\'ai étudié\" par \"j\'ai appliqué\". Les recruteurs veulent voir des résultats, pas des programmes.', en: 'Replace \\"I studied\\" with \\"I applied\\". Recruiters want results, not curricula.', ar: 'استبدل \"درست\" بـ \"طبقت\". يريد المسؤولون نتائج وليس مناهج.', es: 'Reemplaza \\"estudié\\" con \\"apliqué\\". Los reclutadores quieren resultados, no currículos.' }, priority: 'high' },
      { category: 'ats', key: 'grad_ats', label: { fr: 'Optimise pour le score ATS', en: 'Optimize for ATS score', ar: 'حسّن لنتيجة ATS', es: 'Optimiza para puntuación ATS' }, description: { fr: 'Les jeunes diplômés sont souvent filtrés par les ATS. Vérifie que ton CV contient les mots-clés exacts de l\'offre.', en: 'Recent graduates are often filtered by ATS. Make sure your CV contains the exact keywords from the job posting.', ar: 'غالبًا ما يتم تصفية الخريجين الجدد بواسطة ATS. تأكد أن سيرتك تحتوي الكلمات المفتاحية الدقيقة من الإعلان.', es: 'Los recién graduados son a menudo filtrados por ATS. Asegúrate de que tu CV contiene las palabras clave exactas de la oferta.' }, priority: 'high' },
      { category: 'career', key: 'grad_roadmap', label: { fr: 'Planifie ta carrière sur 3 ans', en: 'Plan your 3-year career', ar: 'خطط لمسارك المهني لـ 3 سنوات', es: 'Planifica tu carrera a 3 años' }, description: { fr: 'HireNova IA Career construit une feuille de route personnalisée pour tes 3 premières années professionnelles.', en: 'HireNova IA Career builds a personalized roadmap for your first 3 professional years.', ar: 'يبني HireNova IA Career خارطة طريق مخصصة لأول 3 سنوات مهنية لك.', es: 'HireNova IA Career construye una hoja de ruta personalizada para tus primeros 3 años profesionales.' }, priority: 'medium' },
    ],
    applicationFields: [
      { key: 'degree', labelKey: 'appFieldDegree', placeholderKey: 'appFieldDegreePh', required: true, type: 'text' },
      { key: 'school', labelKey: 'appFieldSchool', placeholderKey: 'appFieldSchoolPh', required: true, type: 'text' },
      { key: 'graduationYear', labelKey: 'appFieldGradDate', placeholderKey: 'appFieldGradDatePh', required: true, type: 'date' },
      { key: 'thesis', labelKey: 'appFieldThesis', placeholderKey: 'appFieldThesisPh', required: false, type: 'textarea' },
      { key: 'projects', labelKey: 'appFieldProjects', placeholderKey: 'appFieldProjectsPh', required: true, type: 'textarea' },
      { key: 'motivation', labelKey: 'appFieldMotivation', placeholderKey: 'appFieldMotivationPh', required: true, type: 'textarea' },
    ],
    applicationIntro: {
      fr: 'Postulez en tant que jeune diplômé — valorisez votre formation et vos projets.',
      en: 'Apply as a recent graduate — value your education and projects.',
      ar: 'قدّم كخريج جديد — قدّر تعليمك ومشاريعك.',
      es: 'Aplica como recién graduado — valora tu formación y proyectos.',
    },
  },

  // =========================================================================
  // PROFESSIONNEL — Experienced worker, career advancement
  // =========================================================================
  professional: {
    id: 'professional',
    emoji: '\uD83D\uDCBC',
    icon: 'Briefcase',
    tagline: {
      fr: 'Ton expérience parle — fais-la parler plus fort',
      en: 'Your experience speaks — make it louder',
      ar: 'خبرتك تتحدث — اجعلها أ louder',
      es: 'Tu experiencia habla — hazla hablar más fuerte',
    },
    valueProp: {
      fr: 'Transforme tes années d\'expérience en un CV qui démontre un impact mesurable. HireNova IA structure tes réalisations avec des métriques et les aligne sur les attentes des recruteurs de ton secteur.',
      en: 'Transform years of experience into a CV that demonstrates measurable impact. HireNova IA structures your achievements with metrics and aligns them with recruiter expectations in your industry.',
      ar: 'حوّل سنوات خبرتك إلى سيرة ذاتية تُظهر تأثيرًا قابلًا للقياس.',
      es: 'Transforma años de experiencia en un CV que demuestra impacto medible.',
    },
    socialProof: {
      fr: '+25 000 professionnels ont boosté leur carrière avec un CV HireNova',
      en: '+25,000 professionals boosted their career with a HireNova CV',
      ar: '+25,000 محترف عززوا مسيرتهم المهنية بسيرة HireNova',
      es: '+25,000 profesionales impulsaron su carrera con un CV HireNova',
    },
    defaultTone: 'formal',
    showApplicationType: true,
    applicationTypes: [
      { value: 'full_time', labelKey: 'appTypeFullTime' },
      { value: 'part_time', labelKey: 'appTypePartTime' },
      { value: 'remote', labelKey: 'appTypeRemote' },
    ],
    extraFields: [
      { key: 'currentRole', labelKey: 'pfProField1', placeholderKey: 'pfProField1Ph', required: true, type: 'text' },
      { key: 'yearsExperience', labelKey: 'pfProField2', placeholderKey: 'pfProField2Ph', required: true, type: 'text' },
      { key: 'keyAchievement', labelKey: 'pfProField3', placeholderKey: 'pfProField3Ph', required: true, type: 'textarea' },
    ],
    autoGenerateCL: true,
    clToneOverride: 'formal',
    autoProposeATS: true,
    atsFocusKeywords: ['expérience', 'experience', 'réalisations', 'achievements', 'management', 'leadership', 'KPI', 'résultats', 'results', 'processus', 'process', 'optimisation', 'roi'],
    suggestions: [
      { category: 'cv', key: 'pro_metrics', label: { fr: 'Ajoute des métriques à chaque expérience', en: 'Add metrics to each experience', ar: 'أضف مقاييس لكل خبرة', es: 'Agrega métricas a cada experiencia' }, description: { fr: '\"Responsable de l\'équipe marketing\" → \"Dirigé une équipe de 8 personnes, augmentant le ROI de 40% en 6 mois\".', en: '\"Marketing team lead\" → \\"Led an 8-person team, increasing ROI by 40% in 6 months\\".', ar: '\"مسؤول فريق التسويق\" → \"أدرت فريقًا من 8 أشخاص، بزيادة العائد على الاستثمار بنسبة 40% في 6 أشهر\".', es: '\"Líder del equipo de marketing\" → \\"Dirigí un equipo de 8 personas, aumentando el ROI en un 40% en 6 meses\\".' }, priority: 'high' },
      { category: 'ats', key: 'pro_ats', label: { fr: 'Score ATS > 80%', en: 'ATS Score > 80%', ar: 'نتيجة ATS > 80%', es: 'Puntuación ATS > 80%' }, description: { fr: 'Avec 5+ ans d\'expérience, tu devrais viser un score ATS > 80%. Optimise tes mots-clés et la structure.', en: 'With 5+ years of experience, you should target an ATS score > 80%. Optimize keywords and structure.', ar: 'مع 5+ سنوات خبرة، يجب أن تستهدف نتيجة ATS > 80%.', es: 'Con 5+ años de experiencia, deberías apuntar a una puntuación ATS > 80%.' }, priority: 'high' },
      { category: 'interview', key: 'pro_interview', label: { fr: 'Prépare les entretiens avancés', en: 'Prepare for advanced interviews', ar: 'حضّر للمقابلات المتقدمة', es: 'Prepárate para entrevistas avanzadas' }, description: { fr: 'Les entretiens pour les postes seniors incluent des études de cas et des questions comportementales.', en: 'Senior-level interviews include case studies and behavioral questions.', ar: 'تتضمن مقابلات المناصب العليا دراسات حالة وأسئلة سلوكية.', es: 'Las entrevistas de nivel senior incluyen estudios de caso y preguntas conductuales.' }, priority: 'medium' },
    ],
    applicationFields: [
      { key: 'currentCompany', labelKey: 'appFieldCurrentCompany', placeholderKey: 'appFieldCurrentCompanyPh', required: true, type: 'text' },
      { key: 'currentRole', labelKey: 'appFieldCurrentRole', placeholderKey: 'appFieldCurrentRolePh', required: true, type: 'text' },
      { key: 'yearsExperience', labelKey: 'appFieldYearsExp', placeholderKey: 'appFieldYearsExpPh', required: true, type: 'text' },
      { key: 'noticePeriod', labelKey: 'appFieldNotice', placeholderKey: 'appFieldNoticePh', required: true, type: 'select', options: [{ value: 'immediate', labelKey: 'appNoticeImmediate' }, { value: '1month', labelKey: 'appNotice1Month' }, { value: '2months', labelKey: 'appNotice2Months' }, { value: '3months', labelKey: 'appNotice3Months' }] },
      { key: 'salaryExpectation', labelKey: 'appFieldSalary', placeholderKey: 'appFieldSalaryPh', required: false, type: 'text' },
      { key: 'motivation', labelKey: 'appFieldMotivation', placeholderKey: 'appFieldMotivationPh', required: true, type: 'textarea' },
    ],
    applicationIntro: {
      fr: 'Postulez en tant que professionnel expérimenté — démontrez votre impact mesurable.',
      en: 'Apply as an experienced professional — demonstrate your measurable impact.',
      ar: 'قدّم كمحترف ذي خبرة — أظهر تأثيرك القابل للقياس.',
      es: 'Aplica como profesional experimentado — demuestra tu impacto medible.',
    },
  },

  // =========================================================================
  // CADRE DIRIGEANT — Executive leadership, C-level, board
  // =========================================================================
  executive: {
    id: 'executive',
    emoji: '\uD83D\uDC54',
    icon: 'UserCheck',
    tagline: {
      fr: 'Ton leadership mérite un CV de niveau C-Suite',
      en: 'Your leadership deserves a C-Suite level CV',
      ar: 'قيادتك تستحق سيرة ذاتية بمستوى C-Suite',
      es: 'Tu liderazgo merece un CV de nivel C-Suite',
    },
    valueProp: {
      fr: 'Un CV exécutif qui projette vision, stratégie et résultats. HireNova IA structure ton parcours pour les boards de recrutement et les chasseurs de têtes, avec un design premium et une narration percutante.',
      en: 'An executive CV that projects vision, strategy, and results. HireNova IA structures your journey for recruiting boards and headhunters, with premium design and compelling narrative.',
      ar: 'سيرة ذاتية تنفيذية تعكس الرؤية والاستراتيجية والنتائج.',
      es: 'Un CV ejecutivo que proyecta visión, estrategia y resultados.',
    },
    socialProof: {
      fr: '+3 200 cadres dirigeants ont confiance à HireNova pour leur positionnement',
      en: '+3,200 executives trust HireNova for their positioning',
      ar: '+3,200 مديرين تنفيذيين يثقون في HireNova لتموضعهم',
      es: '+3,200 ejecutivos confían en HireNova para su posicionamiento',
    },
    defaultTone: 'formal',
    showApplicationType: true,
    applicationTypes: [
      { value: 'c_level', labelKey: 'appTypeCLevel' },
      { value: 'vp_director', labelKey: 'appTypeVpDirector' },
      { value: 'board', labelKey: 'appTypeBoard' },
    ],
    extraFields: [
      { key: 'currentTitle', labelKey: 'pfExecField1', placeholderKey: 'pfExecField1Ph', required: true, type: 'text' },
      { key: 'companySize', labelKey: 'pfExecField2', placeholderKey: 'pfExecField2Ph', required: true, type: 'text' },
      { key: 'reportTo', labelKey: 'pfExecField3', placeholderKey: 'pfExecField3Ph', required: false, type: 'text' },
      { key: 'strategicAchievement', labelKey: 'pfExecField4', placeholderKey: 'pfExecField4Ph', required: true, type: 'textarea' },
    ],
    autoGenerateCL: true,
    clToneOverride: 'formal',
    autoProposeATS: true,
    atsFocusKeywords: ['direction', 'leadership', 'stratégie', 'strategy', 'transformation', 'P&L', 'CA', 'revenue', 'croissance', 'growth', 'gouvernance', 'governance', 'conseil d\'administration', 'board'],
    suggestions: [
      { category: 'cv', key: 'exec_impact', label: { fr: 'Pense impact, pas tâches', en: 'Think impact, not tasks', ar: 'فكر بالتأثير وليس المهام', es: 'Piensa en impacto, no en tareas' }, description: { fr: 'Remplace \"Gestion de l\'équipe\" par \"Bâti et dirigé une équipe de 50+ personnes à travers 3 pays, générant 15M€ de revenus\".', en: 'Replace \\"Managed the team\\" with \\"Built and led a 50+ person team across 3 countries, generating €15M in revenue\\".', ar: 'استبدل \"إدارة الفريق\" بـ \"بنيت وقيت فريقًا من 50+ شخصًا عبر 3 دول، بتحقيق 15 مليون€ إيرادات\".', es: 'Reemplaza \\"Gestioné el equipo\\" con \\"Construí y lideré un equipo de 50+ personas en 3 países, generando 15M€ en ingresos\\".' }, priority: 'high' },
      { category: 'cl', key: 'exec_vision', label: { fr: 'Lettre avec vision stratégique', en: 'Letter with strategic vision', ar: 'رسالة برؤية استراتيجية', es: 'Carta con visión estratégica' }, description: { fr: 'La lettre d\'un dirigeant doit démontrer une vision claire et des résultats quantifiés. HireNova adapte le ton.', en: 'An executive\'s letter must demonstrate clear vision and quantified results. HireNova adapts the tone.', ar: 'يجب أن تُظهر رسالة المدير التنفيذي رؤية واضحة ونتائج كمية.', es: 'La carta de un ejecutivo debe demostrar visión clara y resultados cuantificados.' }, priority: 'high' },
      { category: 'career', key: 'exec_linkedin', label: { fr: 'Profil LinkedIn exécutif', en: 'Executive LinkedIn profile', ar: 'ملف لينكد إن تنفيذي', es: 'Perfil LinkedIn ejecutivo' }, description: { fr: 'Les chasseurs de têtes scrutent LinkedIn. Un profil exécutif optimisé est indispensable.', en: 'Headhunters scrutinize LinkedIn. An optimized executive profile is essential.', ar: 'يبحث صيادو الرؤساء عن لينكد إن. ملف تنفيذي محسن أمر ضروري.', es: 'Los headhunters examinan LinkedIn. Un perfil ejecutivo optimizado es esencial.' }, priority: 'medium' },
    ],
    applicationFields: [
      { key: 'currentTitle', labelKey: 'appFieldCurrentTitle', placeholderKey: 'appFieldCurrentTitlePh', required: true, type: 'text' },
      { key: 'companySize', labelKey: 'appFieldCompanySize', placeholderKey: 'appFieldCompanySizePh', required: true, type: 'text' },
      { key: 'managedBudget', labelKey: 'appFieldBudget', placeholderKey: 'appFieldBudgetPh', required: true, type: 'text' },
      { key: 'noticePeriod', labelKey: 'appFieldNotice', placeholderKey: 'appFieldNoticePh', required: true, type: 'select', options: [{ value: '3months', labelKey: 'appNotice3Months' }, { value: '6months', labelKey: 'appNotice6Months' }, { value: '12months', labelKey: 'appNotice12Months' }] },
      { key: 'confidential', labelKey: 'appFieldConfidential', placeholderKey: 'appFieldConfidentialPh', required: false, type: 'text' },
      { key: 'motivation', labelKey: 'appFieldMotivation', placeholderKey: 'appFieldMotivationPh', required: true, type: 'textarea' },
    ],
    applicationIntro: {
      fr: 'Postulez en tant que cadre dirigeant — projetez vision, stratégie et impact.',
      en: 'Apply as an executive — project vision, strategy, and impact.',
      ar: 'قدّم كمدير تنفيذي — اعرض الرؤية والاستراتيجية والتأثير.',
      es: 'Aplica como ejecutivo — proyecta visión, estrategia e impacto.',
    },
  },

  // =========================================================================
  // FREELANCE — Independent worker, project-based
  // =========================================================================
  freelance: {
    id: 'freelance',
    emoji: '\uD83D\uDE80',
    icon: 'Rocket',
    tagline: {
      fr: 'Ton portfolio est ton CV — rends-le irrésistible',
      en: 'Your portfolio is your CV — make it irresistible',
      ar: 'معرض أعمالك هو سيرتك الذاتية — اجعله لا يُقاوم',
      es: 'Tu portafolio es tu CV — hazlo irresistible',
    },
    valueProp: {
      fr: 'En tant que freelance, tu vends des résultats — pas du temps. HireNova IA crée un CV qui met en avant tes missions, tes taux de réussite et tes compétences spécialisées pour attirer les meilleurs clients.',
      en: 'As a freelancer, you sell results — not time. HireNova AI creates a CV that highlights your missions, success rates, and specialized skills to attract top clients.',
      ar: 'كمستقل، أنت تبيع النتائج — ليس الوقت. ينشئ HireNova IA سيرة ذاتية تبرز مهامك ومعدلات نجاحك ومهاراتك المتخصصة.',
      es: 'Como freelance, vendes resultados — no tiempo. HireNova IA crea un CV que destaca tus misiones, tasas de éxito y habilidades especializadas.',
    },
    socialProof: {
      fr: '+5 800 freelances ont décuplé leurs missions grâce à un CV HireNova',
      en: '+5,800 freelancers multiplied their missions with a HireNova CV',
      ar: '+5,800 مستقل ضاعفوا مهامهم بفضل سيرة HireNova',
      es: '+5,800 freelancers multiplicaron sus misiones con un CV HireNova',
    },
    defaultTone: 'dynamic',
    showApplicationType: false,
    applicationTypes: [],
    extraFields: [
      { key: 'specialization', labelKey: 'pfFreeField1', placeholderKey: 'pfFreeField1Ph', required: true, type: 'text' },
      { key: 'yearsFreelance', labelKey: 'pfFreeField2', placeholderKey: 'pfFreeField2Ph', required: true, type: 'text' },
      { key: 'notableClient', labelKey: 'pfFreeField3', placeholderKey: 'pfFreeField3Ph', required: false, type: 'text' },
    ],
    autoGenerateCL: true,
    clToneOverride: 'dynamic',
    autoProposeATS: true,
    atsFocusKeywords: ['freelance', 'mission', 'projet', 'project', 'client', 'livrable', 'deliverable', 'taux de réussite', 'success rate', 'portefeuille client', 'client portfolio'],
    suggestions: [
      { category: 'cv', key: 'free_portfolio', label: { fr: 'Ajoute tes missions phares', en: 'Add your flagship missions', ar: 'أضف مهامك البارزة', es: 'Agrega tus misiones insignia' }, description: { fr: 'Liste tes 3-5 missions les plus impactantes avec le client, le livrable et le résultat concret.', en: 'List your 3-5 most impactful missions with client, deliverable, and concrete result.', ar: 'اذكر 3-5 مهامك الأكثر تأثيرًا مع العميل والتسليم والنتيجة الملموسة.', es: 'Lista tus 3-5 misiones más impactantes con cliente, entregable y resultado concreto.' }, priority: 'high' },
      { category: 'career', key: 'free_marketplace', label: { fr: 'Rejoins le Marketplace Freelance', en: 'Join the Freelance Marketplace', ar: 'انضم إلى سوق العمل الحر', es: 'Únete al Marketplace Freelance' }, description: { fr: 'HireNova IA Freelance te connecte à des missions qualifiées avec proposition IA automatique.', en: 'HireNova IA Freelance connects you to qualified missions with automatic AI proposal.', ar: 'يربطك HireNova IA Freelance بمهام مؤهلة مع اقتراح ذكاء اصطناعي تلقائي.', es: 'HireNova IA Freelance te conecta con misiones calificadas con propuesta IA automática.' }, priority: 'medium' },
    ],
    applicationFields: [
      { key: 'specialization', labelKey: 'appFieldSpecialization', placeholderKey: 'appFieldSpecializationPh', required: true, type: 'text' },
      { key: 'hourlyRate', labelKey: 'appFieldRate', placeholderKey: 'appFieldRatePh', required: false, type: 'text' },
      { key: 'availability', labelKey: 'appFieldAvailability', placeholderKey: 'appFieldAvailabilityPh', required: true, type: 'select', options: [{ value: 'full_time', labelKey: 'appAvailFullTime' }, { value: 'part_time', labelKey: 'appAvailPartTime' }, { value: 'weekends', labelKey: 'appAvailWeekends' }] },
      { key: 'portfolio', labelKey: 'appFieldPortfolio', placeholderKey: 'appFieldPortfolioPh', required: true, type: 'textarea' },
    ],
    applicationIntro: {
      fr: 'Postulez en tant que freelance — montrez vos résultats et votre expertise.',
      en: 'Apply as a freelancer — show your results and expertise.',
      ar: 'قدّم كمستقل — أظهر نتائجك وخبرتك.',
      es: 'Aplica como freelance — muestra tus resultados y experiencia.',
    },
  },

  // =========================================================================
  // EXPATRIÉ — International mobility, cross-border career
  // =========================================================================
  expat: {
    id: 'expat',
    emoji: '\u2708\uFE0F',
    icon: 'Plane',
    tagline: {
      fr: 'Le monde est ton marché — ton CV doit le prouver',
      en: 'The world is your market — your CV must prove it',
      ar: 'العالم هو سوقك — سيرتك الذاتية يجب أن تثبت ذلك',
      es: 'El mundo es tu mercado — tu CV debe demostrarlo',
    },
    valueProp: {
      fr: 'Un CV international qui traverse les frontières. HireNova IA adapte ton profil aux normes de chaque pays, gère le multilinguisme et met en valeur ta mobilité comme un atout stratégique.',
      en: 'An international CV that crosses borders. HireNova AI adapts your profile to each country\'s standards, manages multilingualism, and highlights your mobility as a strategic asset.',
      ar: 'سيرة ذاتية دولية تعبر الحدود. يكيف HireNova AI ملفك مع معايير كل دولة ويدير تعدد اللغات.',
      es: 'Un CV internacional que cruza fronteras. HireNova IA adapta tu perfil a los estándares de cada país.',
    },
    socialProof: {
      fr: '+4 200 expatriés ont trouvé un poste à l\'international avec HireNova',
      en: '+4,200 expats found an international position with HireNova',
      ar: '+4,200 مغترب وجدوا منصبًا دوليًا مع HireNova',
      es: '+4,200 expatriados encontraron una posición internacional con HireNova',
    },
    defaultTone: 'formal',
    showApplicationType: true,
    applicationTypes: [
      { value: 'international', labelKey: 'appTypeInternational' },
      { value: 'relocation', labelKey: 'appTypeRelocation' },
      { value: 'remote_intl', labelKey: 'appTypeRemoteIntl' },
    ],
    extraFields: [
      { key: 'currentCountry', labelKey: 'pfExpatField1', placeholderKey: 'pfExpatField1Ph', required: true, type: 'text' },
      { key: 'targetCountry', labelKey: 'pfExpatField2', placeholderKey: 'pfExpatField2Ph', required: true, type: 'text' },
      { key: 'visaStatus', labelKey: 'pfExpatField3', placeholderKey: 'pfExpatField3Ph', required: false, type: 'select', options: [{ value: 'citizen', labelKey: 'appVisaCitizen' }, { value: 'work_permit', labelKey: 'appVisaWorkPermit' }, { value: 'sponsorship', labelKey: 'appVisaSponsorship' }, { value: 'none', labelKey: 'appVisaNone' }] },
      { key: 'languages', labelKey: 'pfExpatField4', placeholderKey: 'pfExpatField4Ph', required: true, type: 'text' },
    ],
    autoGenerateCL: true,
    clToneOverride: 'formal',
    autoProposeATS: true,
    atsFocusKeywords: ['international', 'multilingue', 'multilingual', 'mobilité', 'mobility', 'adaptabilité', 'adaptability', 'expérience internationale', 'international experience', 'relocalisation', 'relocation'],
    suggestions: [
      { category: 'cv', key: 'expat_adapt', label: { fr: 'Adapte ton CV au pays cible', en: 'Adapt your CV to the target country', ar: 'كيف سيرتك الذاتية مع البلد المستهدف', es: 'Adapta tu CV al país objetivo' }, description: { fr: 'Utilise HireNova IA MOBILITY pour adapter automatiquement ton CV aux normes locales (photo, âge, format).', en: 'Use HireNova IA MOBILITY to automatically adapt your CV to local standards (photo, age, format).', ar: 'استخدم HireNova IA MOBILITY لتكييف سيرتك تلقائيًا مع المعايير المحلية.', es: 'Usa HireNova IA MOBILITY para adaptar automáticamente tu CV a los estándares locales.' }, priority: 'high' },
      { category: 'ats', key: 'expat_global_ats', label: { fr: 'ATS international', en: 'International ATS', ar: 'ATS دولي', es: 'ATS internacional' }, description: { fr: 'Les systèmes ATS varient par pays. Vérifie ton score pour chaque marché cible.', en: 'ATS systems vary by country. Check your score for each target market.', ar: 'تختلف أنظمة ATS حسب البلد. تحقق من نتيجتك لكل سوق مستهدف.', es: 'Los sistemas ATS varían por país. Verifica tu puntuación para cada mercado objetivo.' }, priority: 'high' },
      { category: 'career', key: 'expat_global', label: { fr: 'Explore les offres internationales', en: 'Explore international opportunities', ar: 'استكشف الفرص الدولية', es: 'Explora oportunidades internacionales' }, description: { fr: 'HireNova IA GLOBAL propose des postes dans 40+ pays avec gestion visa et relocation.', en: 'HireNova IA GLOBAL offers positions in 40+ countries with visa and relocation management.', ar: 'يقدم HireNova IA GLOBAL مناصب في 40+ دولة مع إدارة التأشيرات والانتقال.', es: 'HireNova IA GLOBAL ofrece posiciones en 40+ países con gestión de visa y reubicación.' }, priority: 'medium' },
    ],
    applicationFields: [
      { key: 'currentCountry', labelKey: 'appFieldCurrentCountry', placeholderKey: 'appFieldCurrentCountryPh', required: true, type: 'text' },
      { key: 'targetCountry', labelKey: 'appFieldTargetCountry', placeholderKey: 'appFieldTargetCountryPh', required: true, type: 'text' },
      { key: 'visaStatus', labelKey: 'appFieldVisa', placeholderKey: 'appFieldVisaPh', required: true, type: 'select', options: [{ value: 'citizen', labelKey: 'appVisaCitizen' }, { value: 'work_permit', labelKey: 'appVisaWorkPermit' }, { value: 'sponsorship', labelKey: 'appVisaSponsorship' }, { value: 'none', labelKey: 'appVisaNone' }] },
      { key: 'relocationReadiness', labelKey: 'appFieldRelocation', placeholderKey: 'appFieldRelocationPh', required: true, type: 'select', options: [{ value: 'immediate', labelKey: 'appRelocImmediate' }, { value: '3months', labelKey: 'appReloc3Months' }, { value: '6months', labelKey: 'appReloc6Months' }] },
      { key: 'languages', labelKey: 'appFieldLanguages', placeholderKey: 'appFieldLanguagesPh', required: true, type: 'text' },
      { key: 'motivation', labelKey: 'appFieldMotivation', placeholderKey: 'appFieldMotivationPh', required: true, type: 'textarea' },
    ],
    applicationIntro: {
      fr: 'Postulez à l\'international — votre mobilité est un atout stratégique.',
      en: 'Apply internationally — your mobility is a strategic asset.',
      ar: 'قدّم دوليًا — تنقلك هو أصل استراتيجي.',
      es: 'Aplica internacionalmente — tu movilidad es un activo estratégico.',
    },
  },
}

// --- Helper Functions ---
export function getPersonaConfig(type: PersonaType): PersonaConfig {
  return PERSONA_CONFIGS[type]
}

export function getPersonaSuggestions(type: PersonaType, lang: CVLanguage): PersonaSuggestion[] {
  return PERSONA_CONFIGS[type].suggestions
}

export function getPersonaApplicationFields(type: PersonaType): PersonaFieldDef[] {
  return PERSONA_CONFIGS[type].applicationFields
}

export function getAllPersonas(): PersonaConfig[] {
  return Object.values(PERSONA_CONFIGS)
}
