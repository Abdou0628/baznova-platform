import { countries } from '@/lib/countries'

interface CoverLetterDocumentProps {
  clFormData: {
    fullName: string
    email: string
    phone: string
    address: string
    country: string
    location: string
    companyName: string
    hiringManager: string
  }
  generatedCL: {
    subject: string
    greeting: string
    paragraphs: string[]
    signOff: string
  }
  lang: string
}

export default function CoverLetterDocument({ clFormData, generatedCL, lang }: CoverLetterDocumentProps) {
  const isRTL = lang === 'ar'
  const today = new Date().toLocaleDateString(
    lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="bg-white p-8 sm:p-12 font-sans text-sm leading-relaxed text-gray-800 min-h-[297mm]">
      {/* Sender info */}
      <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="font-bold text-base text-gray-900">{clFormData.fullName}</p>
        {clFormData.phone && <p>{clFormData.phone}</p>}
        <p>{clFormData.email}</p>
        {clFormData.location && <p>{clFormData.location}</p>}
        {clFormData.address && <p>{clFormData.address}</p>}
        {clFormData.country && (() => {
          const c = countries.find((x) => x.code === clFormData.country)
          return c ? <p>{c.name}</p> : null
        })()}
      </div>

      {/* Recipient info */}
      <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        {clFormData.hiringManager && (
          <p className="font-medium">{clFormData.hiringManager}</p>
        )}
        <p className="font-medium">{clFormData.companyName}</p>
      </div>

      {/* Date and Location */}
      <div className={`mb-8 ${isRTL ? 'text-left' : 'text-right'}`}>
        <p>{clFormData.location ? `${clFormData.location}, ` : ''}{today}</p>
      </div>

      {/* Subject line */}
      <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="font-bold text-gray-900 text-base">
          {generatedCL.subject}
        </p>
      </div>

      {/* Greeting */}
      <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p>{generatedCL.greeting}</p>
      </div>

      {/* Body paragraphs */}
      <div className="space-y-5 mb-8">
        {generatedCL.paragraphs.map((paragraph, i) => (
          <p key={i} className={`text-justify ${isRTL ? 'text-right' : 'text-left'}`}>
            {paragraph}
          </p>
        ))}
      </div>

      {/* Sign-off */}
      <div className={`mt-12 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p>{generatedCL.signOff}</p>
        <p className="font-bold mt-4 text-gray-900">{clFormData.fullName}</p>
      </div>
    </div>
  )
}