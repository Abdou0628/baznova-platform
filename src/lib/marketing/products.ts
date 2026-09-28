import { CVLanguage } from '@/lib/i18n'

export interface MarketingProduct {
  slug: string
  icon: string
  color: string
  names: Record<CVLanguage, string>
  headlines: Record<CVLanguage, string>
  descriptions: Record<CVLanguage, string>
  cta: Record<CVLanguage, string>
  voiceScript: Record<CVLanguage, string>
  targetAudience: string
  bundle: string
}

export const marketingProducts: MarketingProduct[] = [
  // ─── 1. CV IA Professionnel ───────────────────────────────────────────
  {
    slug: 'cv',
    icon: 'FileText',
    color: 'emerald',
    names: {
      fr: 'CV IA Professionnel',
      en: 'Professional AI Resume',
      ar: 'سيرة ذاتية احترافية بالذكاء الاصطناعي',
      es: 'Currículum Profesional con IA',
    },
    headlines: {
      fr: 'Votre CV intelligent, optimisé ATS',
      en: 'Your smart, ATS-optimized resume',
      ar: 'سيرتك الذكية المحسنة لأنظمة التتبع',
      es: 'Tu currículum inteligente y optimizado',
    },
    descriptions: {
      fr: 'Créez des CV professionnels en quelques clics grâce à notre moteur IA. Chaque document est automatiquement optimisé pour franchir les filtres ATS des recruteurs. Obtenez un design moderne qui met en valeur vos compétences et votre expérience.',
      en: 'Create professional resumes in just a few clicks with our AI engine. Every document is automatically optimized to pass recruiter ATS filters. Get a modern design that highlights your skills and experience.',
      ar: 'أنشئ سيرًا ذاتية احترافية بنقرات قليلة باستخدام محرك الذكاء الاصطناعي لدينا. كل مستند محسّن تلقائيًا لاجتياز فلاتر ATS لدى مسؤولي التوظيف. احصل على تصميم عصري يبرز مهاراتك وخبرتك.',
      es: 'Crea currículums profesionales en solo unos clics con nuestro motor de IA. Cada documento se optimiza automáticamente para superar los filtros ATS de los reclutadores. Obtén un diseño moderno que resalta tus habilidades y experiencia.',
    },
    cta: {
      fr: 'Créer mon CV',
      en: 'Create My Resume',
      ar: 'أنشئ سيرتي الذاتية',
      es: 'Crear Mi Currículum',
    },
    voiceScript: {
      fr: 'Créez un CV professionnel optimisé par IA en quelques secondes.',
      en: 'Build a professional AI-optimized resume in seconds.',
      ar: 'أنشئ سيرة ذاتية احترافية محسّنة بالذكاء الاصطناعي في ثوانٍ.',
      es: 'Crea un currículum profesional optimizado por IA en segundos.',
    },
    targetAudience: 'job_seeker',
    bundle: 'essential',
  },

  // ─── 2. Analyse ATS ──────────────────────────────────────────────────
  {
    slug: 'ats',
    icon: 'ShieldCheck',
    color: 'violet',
    names: {
      fr: 'Analyse ATS',
      en: 'ATS Scanner',
      ar: 'محلل ATS',
      es: 'Escáner ATS',
    },
    headlines: {
      fr: 'Scannez et améliorez votre score ATS',
      en: 'Scan and boost your ATS score',
      ar: 'امسح وطوّر نقاطك في أنظمة التتبع',
      es: 'Escanea y mejora tu puntuación ATS',
    },
    descriptions: {
      fr: 'Analysez la compatibilité de votre CV avec les principaux systèmes ATS du marché. Recevez des recommandations précises pour améliorer votre score et multiplier vos chances d\'entretien. Un outil indispensable pour toute candidature sérieuse.',
      en: 'Analyze your resume compatibility with leading ATS systems on the market. Get precise recommendations to improve your score and multiply your interview chances. An essential tool for every serious application.',
      ar: 'حلّل توافق سيرتك الذاتية مع أبرز أنظمة ATS في السوق. احصل على توصيات دقيقة لتحسين نقاطك ومضاعفة فرص إجراء المقابلات. أداة لا غنى عنها لكل طلب توظيف جاد.',
      es: 'Analiza la compatibilidad de tu currículum con los principales sistemas ATS del mercado. Recibe recomendaciones precisas para mejorar tu puntuación y multiplicar tus posibilidades de entrevista. Una herramienta esencial para toda aplicación seria.',
    },
    cta: {
      fr: 'Analyser mon CV',
      en: 'Scan My Resume',
      ar: 'تحليل سيرتي الذاتية',
      es: 'Escanear Mi Currículum',
    },
    voiceScript: {
      fr: 'Scannez votre CV et découvrez comment améliorer votre score ATS.',
      en: 'Scan your resume and discover how to improve your ATS score.',
      ar: 'امسح سيرتك الذاتية واكتشف كيف تحسّن نقاطك في ATS.',
      es: 'Escanea tu currículum y descubre cómo mejorar tu puntuación ATS.',
    },
    targetAudience: 'job_seeker',
    bundle: 'essential',
  },

  // ─── 3. Lettre de Motivation IA ───────────────────────────────────────
  {
    slug: 'cover-letter',
    icon: 'Mail',
    color: 'sky',
    names: {
      fr: 'Lettre de Motivation IA',
      en: 'AI Cover Letter',
      ar: 'خطاب تعريف بالذكاء الاصطناعي',
      es: 'Carta de Presentación con IA',
    },
    headlines: {
      fr: 'Des lettres percutantes générées par IA',
      en: 'Powerful AI-generated cover letters',
      ar: 'خطابات تعريف مؤثرة بالذكاء الاصطناعي',
      es: 'Cartas de presentación potentes con IA',
    },
    descriptions: {
      fr: 'Générez des lettres de motivation personnalisées et percutantes pour chaque candidature. Notre IA adapte le ton et le contenu à l\'offre d\'emploi visée. Faites la différence face aux autres candidats avec un texte convaincant et professionnel.',
      en: 'Generate personalized, powerful cover letters for every application. Our AI adapts the tone and content to the target job posting. Stand out from other candidates with a convincing, professional text.',
      ar: 'أنشئ خطابات تعريف مخصصة ومؤثرة لكل طلب توظيف. يتكيف الذكاء الاصطناعي لدينا مع النبرة والمحتوى لكل إعلان وظيفي. تميّز عن المرشحين الآخرين بنص مقنع واحترافي.',
      es: 'Genera cartas de presentación personalizadas y potentes para cada aplicación. Nuestra IA adapta el tono y el contenido a la oferta de trabajo objetivo. Destaca entre otros candidatos con un texto convincente y profesional.',
    },
    cta: {
      fr: 'Générer ma lettre',
      en: 'Generate My Letter',
      ar: 'إنشاء خطابي التعريفي',
      es: 'Generar Mi Carta',
    },
    voiceScript: {
      fr: 'Générez une lettre de motivation personnalisée en un instant.',
      en: 'Generate a personalized cover letter in an instant.',
      ar: 'أنشئ خطاب تعريف مخصص في لحظة.',
      es: 'Genera una carta de presentación personalizada al instante.',
    },
    targetAudience: 'job_seeker',
    bundle: 'essential',
  },

  // ─── 4. Marché de l'Emploi ───────────────────────────────────────────
  {
    slug: 'jobs',
    icon: 'Briefcase',
    color: 'amber',
    names: {
      fr: "Marché de l'Emploi",
      en: 'Job Market',
      ar: 'سوق العمل',
      es: 'Mercado Laboral',
    },
    headlines: {
      fr: 'Trouvez l\'emploi qui vous correspond',
      en: 'Find the job that fits you',
      ar: 'اعثر على الوظيفة المناسبة لك',
      es: 'Encuentra el trabajo que te conviene',
    },
    descriptions: {
      fr: 'Explorez des milliers d\'offres d\'emploi provenant des meilleures entreprises. Notre algorithme de matching vous propose les postes les plus pertinents selon votre profil. Postulez en un clic et suivez vos candidatures en temps réel.',
      en: 'Explore thousands of job postings from top companies. Our matching algorithm suggests the most relevant positions based on your profile. Apply in one click and track your applications in real time.',
      ar: 'استكشف آلاف الإعلانات الوظيفية من أفضل الشركات. تعرض خوارزمية المطابقة لدينا الوظائف الأكثر ملاءمة لملفك الشخصي. قدّم في نقرة واحدة وتتبع طلباتك في الوقت الفعلي.',
      es: 'Explora miles de ofertas de trabajo de las mejores empresas. Nuestro algoritmo de coincidencia te sugiere los puestos más relevantes según tu perfil. Aplica en un clic y haz seguimiento a tus aplicaciones en tiempo real.',
    },
    cta: {
      fr: 'Explorer les offres',
      en: 'Explore Jobs',
      ar: 'استكشاف الوظائف',
      es: 'Explorar Ofertas',
    },
    voiceScript: {
      fr: 'Trouvez l\'emploi idéal grâce à notre algorithme de matching intelligent.',
      en: 'Find your ideal job with our smart matching algorithm.',
      ar: 'اعثر على الوظيفة المثالية بخوارزمية المطابقة الذكية لدينا.',
      es: 'Encuentra el trabajo ideal con nuestro algoritmo de coincidencia inteligente.',
    },
    targetAudience: 'job_seeker',
    bundle: 'essential',
  },

  // ─── 5. Opportunités Internationales ──────────────────────────────────
  {
    slug: 'global',
    icon: 'Globe',
    color: 'rose',
    names: {
      fr: 'Opportunités Internationales',
      en: 'Global Opportunities',
      ar: 'فرص دولية',
      es: 'Oportunidades Globales',
    },
    headlines: {
      fr: 'Des offres dans le monde entier',
      en: 'Opportunities across the globe',
      ar: 'وظائف في أنحاء العالم',
      es: 'Ofertas en todo el mundo',
    },
    descriptions: {
      fr: 'Accédez à des opportunités professionnelles dans plus de 150 pays. Nos partenariats internationaux vous ouvrent les portes des marchés les plus dynamiques. Développez votre carrière au-delà des frontières avec un accompagnement complet.',
      en: 'Access professional opportunities in over 150 countries. Our international partnerships open doors to the most dynamic markets. Grow your career beyond borders with full support.',
      ar: 'انضم إلى فرص مهنية في أكثر من 150 دولة. شراكاتنا الدولية تفتح لك أبواب أكثر الأسواق ديناميكية. طوّر مسيرتك المهنية خارج الحدود بدعم كامل.',
      es: 'Accede a oportunidades profesionales en más de 150 países. Nuestras alianzas internacionales te abren las puertas de los mercados más dinámicos. Desarrolla tu carrera más allá de las fronteras con apoyo completo.',
    },
    cta: {
      fr: 'Explorer le monde',
      en: 'Explore the World',
      ar: 'استكشاف العالم',
      es: 'Explorar el Mundo',
    },
    voiceScript: {
      fr: 'Développez votre carrière à l\'international avec des offres mondiales.',
      en: 'Grow your career internationally with global job openings.',
      ar: 'طوّر مسيرتك المهنية دوليًا مع وظائف حول العالم.',
      es: 'Desarrolla tu carrera internacionalmente con ofertas globales.',
    },
    targetAudience: 'job_seeker',
    bundle: 'pro',
  },

  // ─── 6. Simulateur d'Entretien IA ────────────────────────────────────
  {
    slug: 'interview',
    icon: 'Mic',
    color: 'blue',
    names: {
      fr: "Simulateur d'Entretien IA",
      en: 'AI Interview Simulator',
      ar: 'محاكي المقابلات بالذكاء الاصطناعي',
      es: 'Simulador de Entrevistas con IA',
    },
    headlines: {
      fr: 'Pratiquez avec un coach IA',
      en: 'Practice with an AI coach',
      ar: 'تدرّب مع مدرب بالذكاء الاصطناعي',
      es: 'Practica con un coach de IA',
    },
    descriptions: {
      fr: 'Préparez-vous aux entretiens d\'embauche avec des simulations réalistes pilotées par IA. Recevez un feedback détaillé sur vos réponses, votre ton et votre langage corporel. Gagnez en confiance pour décrocher l\'emploi de vos rêves.',
      en: 'Prepare for job interviews with realistic AI-driven simulations. Receive detailed feedback on your answers, tone, and body language. Build the confidence to land your dream job.',
      ar: 'استعد لمقابلات التوظيف بمحاكاة واقعية يقودها الذكاء الاصطناعي. احصل على ملاحظات مفصلة حول إجاباتك ونبرتك ولغة جسدك. اكتسب الثقة للحصول على وظيفة أحلامك.',
      es: 'Prepárate para entrevistas de trabajo con simulaciones realistas impulsadas por IA. Recibe retroalimentación detallada sobre tus respuestas, tono y lenguaje corporal. Gana confianza para conseguir el trabajo de tus sueños.',
    },
    cta: {
      fr: 'Lancer une simulation',
      en: 'Start a Simulation',
      ar: 'بدء المحاكاة',
      es: 'Iniciar una Simulación',
    },
    voiceScript: {
      fr: 'Pratiquez vos entretiens avec notre simulateur IA et gagnez en confiance.',
      en: 'Practice interviews with our AI simulator and build confidence.',
      ar: 'تدرّب على المقابلات مع محاكي الذكاء الاصطناعي واكتسب الثقة.',
      es: 'Practica entrevistas con nuestro simulador de IA y gana confianza.',
    },
    targetAudience: 'job_seeker',
    bundle: 'pro',
  },

  // ─── 7. Optimiseur LinkedIn IA ────────────────────────────────────────
  {
    slug: 'linkedin',
    icon: 'Linkedin',
    color: 'teal',
    names: {
      fr: 'Optimiseur LinkedIn IA',
      en: 'AI LinkedIn Optimizer',
      ar: 'محسّن لينكدإن بالذكاء الاصطناعي',
      es: 'Optimizador de LinkedIn con IA',
    },
    headlines: {
      fr: 'Optimisez votre profil LinkedIn',
      en: 'Optimize your LinkedIn profile',
      ar: 'حسّن ملفك على لينكدإن',
      es: 'Optimiza tu perfil de LinkedIn',
    },
    descriptions: {
      fr: 'Transformez votre profil LinkedIn en aimant à recruteurs grâce à l\'IA. Notre outil analyse votre profil actuel et propose des améliorations concrètes pour maximiser votre visibilité. Attirez les bonnes opportunités professionnelles naturellement.',
      en: 'Transform your LinkedIn profile into a recruiter magnet with AI. Our tool analyzes your current profile and suggests concrete improvements to maximize your visibility. Attract the right professional opportunities naturally.',
      ar: 'حوّل ملفك على لينكدإن إلى مغناطيس للمسؤولين عن التوظيف بالذكاء الاصطناعي. تحلل أداوتنا ملفك الحالي وتقترح تحسينات ملموسة لزيادة ظهورك. اجذب الفرص المهنية المناسبة بشكل طبيعي.',
      es: 'Transforma tu perfil de LinkedIn en un imán para reclutadores con IA. Nuestra herramienta analiza tu perfil actual y sugiere mejoras concretas para maximizar tu visibilidad. Atrae las oportunidades profesionales correctas de forma natural.',
    },
    cta: {
      fr: 'Optimiser mon profil',
      en: 'Optimize My Profile',
      ar: 'تحسين ملفي الشخصي',
      es: 'Optimizar Mi Perfil',
    },
    voiceScript: {
      fr: 'Optimisez votre profil LinkedIn pour attirer plus de recruteurs.',
      en: 'Optimize your LinkedIn profile to attract more recruiters.',
      ar: 'حسّن ملفك على لينكدإن لجذب المزيد من مسؤولي التوظيف.',
      es: 'Optimiza tu perfil de LinkedIn para atraer más reclutadores.',
    },
    targetAudience: 'job_seeker',
    bundle: 'pro',
  },

  // ─── 8. Plan de Carrière IA ───────────────────────────────────────────
  {
    slug: 'career',
    icon: 'Route',
    color: 'orange',
    names: {
      fr: 'Plan de Carrière IA',
      en: 'AI Career Plan',
      ar: 'خطة مسيرة مهنية بالذكاء الاصطناعي',
      es: 'Plan de Carrera con IA',
    },
    headlines: {
      fr: 'Votre feuille de route personnalisée',
      en: 'Your personalized career roadmap',
      ar: 'خارطة طريقك المهنية المخصصة',
      es: 'Tu hoja de ruta personalizada',
    },
    descriptions: {
      fr: 'Construisez une stratégie de carrière claire et actionnable avec l\'intelligence artificielle. Identifiez vos forces, comblez vos lacunes et définissez des étapes concrètes pour atteindre vos objectifs. Un plan sur mesure qui évolue avec votre parcours.',
      en: 'Build a clear, actionable career strategy with artificial intelligence. Identify your strengths, bridge your gaps, and define concrete steps to reach your goals. A custom plan that evolves with your journey.',
      ar: 'ابنِ استراتيجية مهنية واضحة وقابلة للتنفيذ مع الذكاء الاصطناعي. حدد نقاط قوتك وسد فجواتك وحدد خطوات ملموسة لتحقيق أهدافك. خطة مخصصة تتطور مع مسيرتك.',
      es: 'Construye una estrategia de carrera clara y accionable con inteligencia artificial. Identifica tus fortalezas, cierra brechas y define pasos concretos para alcanzar tus metas. Un plan personalizado que evoluciona con tu trayectoria.',
    },
    cta: {
      fr: 'Créer mon plan',
      en: 'Create My Plan',
      ar: 'إنشاء خطتي',
      es: 'Crear Mi Plan',
    },
    voiceScript: {
      fr: 'Élaborez votre feuille de route de carrière avec l\'intelligence artificielle.',
      en: 'Build your career roadmap with artificial intelligence.',
      ar: 'ضع خارطة طريقك المهنية مع الذكاء الاصطناعي.',
      es: 'Elabora tu hoja de ruta de carrera con inteligencia artificial.',
    },
    targetAudience: 'job_seeker',
    bundle: 'pro',
  },

  // ─── 9. Coach Carrière IA ─────────────────────────────────────────────
  {
    slug: 'coach',
    icon: 'MessageCircle',
    color: 'indigo',
    names: {
      fr: 'Coach Carrière IA',
      en: 'AI Career Coach',
      ar: 'مدرب مسيرة مهنية بالذكاء الاصطناعي',
      es: 'Coach de Carrera con IA',
    },
    headlines: {
      fr: 'Un mentor IA disponible 24/7',
      en: 'An AI mentor available 24/7',
      ar: 'مرشد بالذكاء الاصطناعي متاح على مدار الساعة',
      es: 'Un mentor de IA disponible 24/7',
    },
    descriptions: {
      fr: 'Bénéficiez d\'un accompagnement personnalisé à tout moment grâce à votre coach carrière IA. Posez vos questions, obtenez des conseils sur mesure et explorez de nouvelles pistes professionnelles. Un véritable mentor qui comprend vos ambitions et vous guide vers le succès.',
      en: 'Get personalized guidance anytime with your AI career coach. Ask questions, get tailored advice, and explore new professional paths. A true mentor that understands your ambitions and guides you toward success.',
      ar: 'استفد من إرشاد مخصص في أي وقت بفضل مدرب المسيرة المهنية بالذكاء الاصطناعي. اطرح أسئلتك واحصل على نصائح مصممة خصيصًا واستكشف مسارات مهنية جديدة. مرشد حقيقي يفهم طموحاتك ويوجهك نحو النجاح.',
      es: 'Recibe orientación personalizada en cualquier momento con tu coach de carrera IA. Haz preguntas, obtén consejos a medida y explora nuevos caminos profesionales. Un verdadero mentor que entiende tus ambiciones y te guía hacia el éxito.',
    },
    cta: {
      fr: 'Parler à mon coach',
      en: 'Talk to My Coach',
      ar: 'تحدث مع مدربي',
      es: 'Hablar con Mi Coach',
    },
    voiceScript: {
      fr: 'Votre coach carrière IA vous accompagne à chaque étape, jour et nuit.',
      en: 'Your AI career coach guides you every step, day and night.',
      ar: 'مدرب المسيرة المهنية يرافقك في كل خطوة، ليلًا ونهارًا.',
      es: 'Tu coach de carrera IA te acompaña en cada paso, día y noche.',
    },
    targetAudience: 'job_seeker',
    bundle: 'pro',
  },

  // ─── 10. Formations Certifiantes ──────────────────────────────────────
  {
    slug: 'formation',
    icon: 'GraduationCap',
    color: 'pink',
    names: {
      fr: 'Formations Certifiantes',
      en: 'Certified Training',
      ar: 'تدريبات معتمدة',
      es: 'Formaciones Certificadas',
    },
    headlines: {
      fr: 'Développez vos compétences',
      en: 'Develop your skills',
      ar: 'طوّر مهاراتك',
      es: 'Desarrolla tus habilidades',
    },
    descriptions: {
      fr: 'Accédez à un catalogue de formations certifiantes conçu pour booster votre employabilité. Apprenez à votre rythme avec des contenus créés par des experts reconnus. Obtenez des certifications valorisées par les recruteurs et les entreprises.',
      en: 'Access a catalog of certified training designed to boost your employability. Learn at your own pace with content created by recognized experts. Earn certifications valued by recruiters and companies.',
      ar: 'انضم إلى كتالوج تدريبات معتمدة مصمم لتعزيز فرص توظيفك. تعلم بوتركك الخاص مع محتوى من خبراء معتمدين. احصل على شهادات يقدرها المسؤولون عن التوظيف والشركات.',
      es: 'Accede a un catálogo de formaciones certificadas diseñadas para impulsar tu empleabilidad. Aprende a tu propio ritmo con contenido creado por expertos reconocidos. Obtén certificaciones valoradas por reclutadores y empresas.',
    },
    cta: {
      fr: 'Découvrir les formations',
      en: 'Discover Training',
      ar: 'اكتشف التدريبات',
      es: 'Descubrir Formaciones',
    },
    voiceScript: {
      fr: 'Boostez votre carrière avec des formations certifiantes reconnues.',
      en: 'Boost your career with recognized certified training programs.',
      ar: 'عزّز مسيرتك المهنية ببرامج تدريبية معتمدة ومعترف بها.',
      es: 'Impulsa tu carrera con programas de formación certificados reconocidos.',
    },
    targetAudience: 'job_seeker',
    bundle: 'pro',
  },

  // ─── 11. Missions Freelance ───────────────────────────────────────────
  {
    slug: 'freelance',
    icon: 'Laptop',
    color: 'cyan',
    names: {
      fr: 'Missions Freelance',
      en: 'Freelance Missions',
      ar: 'مشاريع العمل الحر',
      es: 'Misiones Freelance',
    },
    headlines: {
      fr: 'Trouvez des missions freelance',
      en: 'Find freelance missions',
      ar: 'اعثر على مشاريع عمل حر',
      es: 'Encuentra misiones freelance',
    },
    descriptions: {
      fr: 'Connectez-vous avec des entreprises qui recherchent des experts indépendants pour des missions variées. Notre plateforme filtre les opportunités selon vos compétences et votre taux horaire. Gérez vos contrats et vos paiements en toute simplicité.',
      en: 'Connect with companies looking for independent experts for diverse missions. Our platform filters opportunities based on your skills and hourly rate. Manage your contracts and payments with ease.',
      ar: 'تواصل مع شركات تبحث عن خبراء مستقلين لمشاريع متنوعة. تصفّح منصتنا الفرص حسب مهاراتك ومعدلك الساعي. أدِر عقودك ومدفوعاتك بسهولة.',
      es: 'Conéctate con empresas que buscan expertos independientes para misiones diversas. Nuestra plataforma filtra las oportunidades según tus habilidades y tarifa horaria. Gestiona tus contratos y pagos con facilidad.',
    },
    cta: {
      fr: 'Trouver une mission',
      en: 'Find a Mission',
      ar: 'اعثر على مشروع',
      es: 'Encontrar una Misión',
    },
    voiceScript: {
      fr: 'Trouvez la mission freelance idéale et développez votre activité indépendante.',
      en: 'Find the ideal freelance mission and grow your independent business.',
      ar: 'اعثر على مشروع العمل الحر المثالي وطوّر أعمالك المستقلة.',
      es: 'Encuentra la misión freelance ideal y haz crecer tu negocio independiente.',
    },
    targetAudience: 'freelancer',
    bundle: 'business',
  },

  // ─── 12. Mobilité Internationale ──────────────────────────────────────
  {
    slug: 'mobility',
    color: 'lime',
    icon: 'Plane',
    names: {
      fr: 'Mobilité Internationale',
      en: 'International Mobility',
      ar: 'التنقل الدولي',
      es: 'Movilidad Internacional',
    },
    headlines: {
      fr: 'Conquérez de nouveaux marchés',
      en: 'Conquer new markets',
      ar: 'افتح أسواقًا جديدة',
      es: 'Conquista nuevos mercados',
    },
    descriptions: {
      fr: 'Préparez votre expatriation ou votre télétravail international avec un accompagnement sur mesure. Obtenez des informations sur les visas, la fiscalité et les conditions de vie dans votre pays de destination. Une transition fluide vers votre nouvelle vie professionnelle à l\'étranger.',
      en: 'Prepare your expatriation or international remote work with tailored support. Get information on visas, taxes, and living conditions in your destination country. A smooth transition to your new professional life abroad.',
      ar: 'جهّز نفسك للعمل بالخارج أو العمل عن بعد دوليًا بدعم مخصص. احصل على معلومات عن التأشيرات والضرائب وظروف المعيشة في بلد وجهتك. انتقال سلس إلى حياتك المهنية الجديدة في الخارج.',
      es: 'Prepara tu expatriación o teletrabajo internacional con apoyo personalizado. Obtén información sobre visas, impuestos y condiciones de vida en tu país de destino. Una transición fluida hacia tu nueva vida profesional en el extranjero.',
    },
    cta: {
      fr: 'Préparer ma mobilité',
      en: 'Prepare My Mobility',
      ar: 'جهّز تنقلي الدولي',
      es: 'Preparar Mi Movilidad',
    },
    voiceScript: {
      fr: 'Préparez sereinement votre mobilité internationale avec notre accompagnement.',
      en: 'Prepare your international relocation with confidence and our expert support.',
      ar: 'جهّز تنقلك الدولي بثقة مع دعمنا المتخصص.',
      es: 'Prepara tu movilidad internacional con confianza y nuestro apoyo experto.',
    },
    targetAudience: 'job_seeker',
    bundle: 'business',
  },

  // ─── 13. Espace Recruteur ─────────────────────────────────────────────
  {
    slug: 'recruiter',
    icon: 'Users',
    color: 'fuchsia',
    names: {
      fr: 'Espace Recruteur',
      en: 'Recruiter Hub',
      ar: 'منصة المسؤول عن التوظيف',
      es: 'Espacio Reclutador',
    },
    headlines: {
      fr: 'Trouvez les meilleurs talents',
      en: 'Find top talent',
      ar: 'اعثر على أفضل المواهب',
      es: 'Encuentra los mejores talentos',
    },
    descriptions: {
      fr: 'Accédez à un vivier de candidats qualifiés et pré-sélectionnés par notre IA. Publiez vos offres, gérez vos processus de recrutement et identifiez rapidement les profils les plus prometteurs. Un tableau de bord puissant pour piloter votre stratégie de recrutement.',
      en: 'Access a pool of qualified candidates pre-selected by our AI. Post your job openings, manage your recruitment process, and quickly identify the most promising profiles. A powerful dashboard to drive your recruitment strategy.',
      ar: 'انضم إلى مجموعة المرشحين المؤهلين المختارين مسبقًا بالذكاء الاصطناعي. انشر وظائفك وأدر عمليات التوظيف وحدد بسرعة أكثر الملفات الواعدة. لوحة تحكم قوية لتوجيه استراتيجية التوظيف لديك.',
      es: 'Accede a un banco de candidatos calificados preseleccionados por nuestra IA. Publica tus ofertas, gestiona tu proceso de reclutamiento e identifica rápidamente los perfiles más prometedores. Un panel poderoso para impulsar tu estrategia de reclutamiento.',
    },
    cta: {
      fr: 'Accéder à l\'espace',
      en: 'Access the Hub',
      ar: 'الوصول إلى المنصة',
      es: 'Acceder al Espacio',
    },
    voiceScript: {
      fr: 'Identifiez les meilleurs talents rapidement grâce à l\'IA recruteur.',
      en: 'Identify top talent quickly with AI-powered recruiting.',
      ar: 'حدد أفضل المواهب بسرعة بفضل التوظيف بالذكاء الاصطناعي.',
      es: 'Identifica los mejores talentos rápidamente con reclutamiento impulsado por IA.',
    },
    targetAudience: 'employer',
    bundle: 'business',
  },

  // ─── 14. Intelligence de Marché ──────────────────────────────────────
  {
    slug: 'intelligence',
    icon: 'TrendingUp',
    color: 'yellow',
    names: {
      fr: 'Intelligence de Marché',
      en: 'Market Intelligence',
      ar: 'استخبارات السوق',
      es: 'Inteligencia de Mercado',
    },
    headlines: {
      fr: 'Anticipez les tendances',
      en: 'Anticipate market trends',
      ar: 'توقع اتجاهات السوق',
      es: 'Anticipa las tendencias',
    },
    descriptions: {
      fr: 'Prenez des décisions éclairées grâce à des analyses de marché en temps réel. Suivez l\'évolution des salaires, des compétences les plus demandées et des secteurs en croissance. Des données exploitables pour orienter votre stratégie de recrutement ou de carrière.',
      en: 'Make informed decisions with real-time market analysis. Track salary trends, the most in-demand skills, and growing sectors. Actionable data to guide your recruitment or career strategy.',
      ar: 'اتخذ قرارات مدروسة بتحليلات سوق في الوقت الفعلي. تتبع تطور الرواتب والمهارات الأكثر طلبًا والقطاعات النامية. بيانات قابلة للتنفيذ لتوجيه استراتيجية التوظيف أو المسيرة المهنية.',
      es: 'Toma decisiones informadas con análisis de mercado en tiempo real. Sigue las tendencias salariales, las habilidades más demandadas y los sectores en crecimiento. Datos accionables para guiar tu estrategia de reclutamiento o carrera.',
    },
    cta: {
      fr: 'Explorer les données',
      en: 'Explore Data',
      ar: 'استكشاف البيانات',
      es: 'Explorar Datos',
    },
    voiceScript: {
      fr: 'Anticipez les évolutions du marché avec notre intelligence de carrière.',
      en: 'Anticipate market shifts with our career intelligence platform.',
      ar: 'توقع تحولات السوق مع منصة استخبارات المسيرة لدينا.',
      es: 'Anticipa los cambios del mercado con nuestra plataforma de inteligencia.',
    },
    targetAudience: 'employer',
    bundle: 'business',
  },

  // ─── 15. Solution White Label ─────────────────────────────────────────
  {
    slug: 'white-label',
    icon: 'Palette',
    color: 'red',
    names: {
      fr: 'Solution White Label',
      en: 'White Label Solution',
      ar: 'حل العلامة البيضاء',
      es: 'Solución White Label',
    },
    headlines: {
      fr: 'Votre marque, notre technologie',
      en: 'Your brand, our technology',
      ar: 'علامتك التجارية، تقنيتنا',
      es: 'Tu marca, nuestra tecnología',
    },
    descriptions: {
      fr: 'Déployez une plateforme de recrutement complète sous votre propre marque en quelques jours. Notre solution white label vous offre toutes les fonctionnalités HireNova avec une personnalisation totale. Idéal pour les agences, les écoles et les grandes entreprises.',
      en: 'Deploy a complete recruitment platform under your own brand in just a few days. Our white label solution gives you all HireNova features with full customization. Ideal for agencies, schools, and large enterprises.',
      ar: 'انشر منصة توظيف كاملة تحت علامتك التجارية في أيام قليلة. يمنحك حل العلامة البيضاء جميع ميزات HireNova مع تخصيص كامل. مثالي للوكالات والمدارس والمؤسسات الكبيرة.',
      es: 'Despliega una plataforma de reclutamiento completa bajo tu propia marca en pocos días. Nuestra solución white label te ofrece todas las funciones de HireNova con personalización total. Ideal para agencias, escuelas y grandes empresas.',
    },
    cta: {
      fr: 'Demander une démo',
      en: 'Request a Demo',
      ar: 'اطلب عرضًا توضيحيًا',
      es: 'Solicitar una Demo',
    },
    voiceScript: {
      fr: 'Lancez votre plateforme de recrutement sous votre marque avec HireNova.',
      en: 'Launch your recruitment platform under your brand with HireNova.',
      ar: 'أطلق منصة التوظيف الخاصة بك بعلامتك التجارية مع HireNova.',
      es: 'Lanza tu plataforma de reclutamiento bajo tu marca con HireNova.',
    },
    targetAudience: 'employer',
    bundle: 'enterprise',
  },
]
