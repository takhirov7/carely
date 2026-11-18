import { GoogleGenAI, Type } from '@google/genai';
import {
  AIConversation,
  AIReport,
  CareCase,
  DailyCheckIn,
  MedicationEvent,
  NotificationItem,
  Patient,
  TranscriptMessage,
} from '../shared/types';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateAiVoiceTurn(params: {
  patient: Patient;
  conversationType: AIConversation['conversationType'];
  transcript: TranscriptMessage[];
  patientMessage: string;
}): Promise<{
  aiReply: string;
  structuredSummary: AIConversation['structuredSummary'];
  usedGemini: boolean;
}> {
  const ai = getAiClient();
  const lower = params.patientMessage.toLowerCase();

  // Deterministic medical safety fallback & urgent symptom check
  const urgentKeywords = [
    'nafas qisishi',
    'hushdan ketish',
    'kuchli qon',
    'ko‘krak qafasida kuchli og‘riq',
    '103',
    'chiday olmayapman',
  ];
  const isUrgent = urgentKeywords.some((k) => lower.includes(k));

  const confirmedMed =
    lower.includes('ichdim') ||
    lower.includes('qabul qildim') ||
    lower.includes('ha, ichdim') ||
    (lower.includes('ha') && params.transcript.length <= 2);

  const requestedDoctor =
    lower.includes('shifokor') ||
    lower.includes('bog‘lanish') ||
    lower.includes('maslahat') ||
    lower.includes('og‘riq') ||
    isUrgent;

  const painMatch = params.patientMessage.match(/\b([0-9]|10)\b/);
  const extractedPain = painMatch ? Number(painMatch[1]) : lower.includes('og‘riq') ? 5 : null;

  if (ai) {
    try {
      const historyText = params.transcript
        .map((m) => `${m.speaker === 'AI' ? 'CareBridge AI' : 'Bemor'}: ${m.text}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Bemor ismi: ${params.patient.fullName}
Muloqot turi: ${params.conversationType}
Avvalgi suhbat:
${historyText}
Bemorning yangi javobi: "${params.patientMessage}"`,
        config: {
          systemInstruction: `Siz CareBridge AI virtual yordamchisisiz (O‘zbek tilida, lotin alifbosida muloqot qilasiz).
Vazifangiz:
1. Bemorga o‘zingizni sun'iy intellekt yordamchisi sifatida muloyim tanishtirish yoki suhbatni davom ettirish.
2. Dori qabuli tasdig‘ini, bugungi umumiy ahvolini va shifokor bilan bog‘lanish istagini qisqa (2-3 jumlada) so‘rash va qayd etish.
QAT'IY TIBBIY XAVFSIZLIK QOIDALARI:
- Hech qachon kasallikka tashxis qo‘ymang.
- Hech qachon yangi dori yozmang yoki dori dozasini o‘zgartirmang (o‘tkazib yuborilgan dozani ikki barobar ichishni aslo tavsiya qilmang).
- Bemorni "to‘liq tuzaldingiz" deb tibbiy xulosa bermang.
- Agar bemor shoshilinch yoki xavfli belgilarni aytsa, zudlik bilan 103 tez tibbiy yordamga murojaat qilishni ayting va shifokorga xabar yuborilishini bildiring.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiReply: {
                type: Type.STRING,
                description: 'Bemorning javobiga O‘zbek tilida muloyim va xavfsiz javob (2-3 jumla).',
              },
              medicationConfirmed: {
                type: Type.STRING,
                description: 'Ha (bemor tasdiqladi) | Yo‘q / Keyinroq | So‘ralmadi',
              },
              reportedSymptoms: {
                type: Type.STRING,
                description: 'Bemor aytgan shikoyatlar qisqacha',
              },
              painLevelMentioned: {
                type: Type.INTEGER,
                description: '0 dan 10 gacha og‘riq darajasi yoki -1',
              },
              requestedDoctorCallback: {
                type: Type.BOOLEAN,
              },
              requiresClinicianReview: {
                type: Type.BOOLEAN,
              },
              summaryUz: {
                type: Type.STRING,
                description: 'Shifokor uchun 1-2 jumlalik aniq xulosa.',
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (parsed.aiReply) {
        return {
          aiReply: parsed.aiReply,
          structuredSummary: {
            medicationConfirmed:
              parsed.medicationConfirmed === 'Ha (bemor tasdiqladi)'
                ? 'Ha (bemor tasdiqladi)'
                : parsed.medicationConfirmed === 'Yo‘q / Keyinroq'
                ? 'Yo‘q / Keyinroq'
                : confirmedMed
                ? 'Ha (bemor tasdiqladi)'
                : 'So‘ralmadi',
            reportedSymptoms:
              parsed.reportedSymptoms || params.patientMessage,
            painLevelMentioned:
              typeof parsed.painLevelMentioned === 'number' &&
              parsed.painLevelMentioned >= 0
                ? parsed.painLevelMentioned
                : extractedPain,
            requestedDoctorCallback:
              Boolean(parsed.requestedDoctorCallback) || requestedDoctor,
            requiresClinicianReview:
              Boolean(parsed.requiresClinicianReview) || requestedDoctor || isUrgent,
            summaryUz:
              parsed.summaryUz ||
              `Bemor javobi: "${params.patientMessage}". Shifokor ko‘rigi uchun qayd etildi.`,
          },
          usedGemini: true,
        };
      }
    } catch {
      // Fall through to deterministic medical-safe Uzbek fallback
    }
  }

  let fallbackReply =
    'Javobingiz uchun rahmat, ma’lumotlar qayd etildi. Bugun o‘zingizni qanday his qilyapsiz yoki shifokoringiz bilan bog‘lanishni xohlaysizmi?';

  if (isUrgent) {
    fallbackReply =
      'Men Carely virtual yordamchisiman va tibbiy tashxis qo‘ya olmayman. Siz aytgan belgilar jiddiy bo‘lishi mumkin — iltimos, darhol 103 tez tibbiy yordam xizmatiga murojaat qiling. Men hoziroq mas’ul shifokoringizga shoshilinch bildirishnoma yubordim.';
  } else if (confirmedMed && !lower.includes('og‘riq')) {
    fallbackReply =
      'Rahmat! Dori qabul qilganingiz bo‘yicha tasdiqingiz qayd etildi. Bugun o‘zingizni qanday his qilyapsiz, yangi shikoyatingiz bormi?';
  } else if (requestedDoctor) {
    fallbackReply =
      'Tushunarli, javobingiz uchun rahmat. Men dori rejasini o‘zgartirmayman, ammo shikoyatingiz va bog‘lanish so‘rovingizni hoziroq davolovchi shifokoringizga yubordim.';
  }

  return {
    aiReply: fallbackReply,
    structuredSummary: {
      medicationConfirmed: confirmedMed ? 'Ha (bemor tasdiqladi)' : 'So‘ralmadi',
      reportedSymptoms: params.patientMessage,
      painLevelMentioned: extractedPain,
      requestedDoctorCallback: requestedDoctor,
      requiresClinicianReview: requestedDoctor || isUrgent,
      summaryUz: `Bemor javobi qayd etildi: "${params.patientMessage}". ${
        requestedDoctor ? 'Shifokor bilan bog‘lanish so‘rovi yaratildi.' : 'Rejali kuzatuv davom etmoqda.'
      }`,
    },
    usedGemini: false,
  };
}

export async function generatePatientAiReport(params: {
  patient: Patient;
  careCase?: CareCase;
  medicationEvents: MedicationEvent[];
  checkIns: DailyCheckIn[];
  notifications: NotificationItem[];
  conversations: AIConversation[];
  doctorName: string;
}): Promise<{
  summary: AIReport['summary'];
  sourceEventIds: string[];
  usedGemini: boolean;
}> {
  const takenCount = params.medicationEvents.filter(
    (e) => e.reportedStatus === 'Ichdim'
  ).length;
  const missedCount = params.medicationEvents.filter(
    (e) => e.reportedStatus === 'O‘tkazib yubordim'
  ).length;
  const unconfirmedCount = params.medicationEvents.filter(
    (e) => e.reportedStatus === 'Tasdiqlanmagan'
  ).length;

  const sourceEventIds = [
    ...params.medicationEvents.slice(0, 4).map((e) => e.id),
    ...params.checkIns.slice(0, 3).map((c) => c.id),
    ...params.conversations.slice(0, 2).map((a) => a.id),
  ];

  const latestCheckIn = params.checkIns[0];
  const painScores = params.checkIns.map((c) => `${c.painScore}/10 (${c.submittedAt.slice(0, 10)})`);
  const unansweredNotifs = params.notifications.filter(
    (n) => n.status === 'Javob kutilmoqda'
  );
  const contactRequests = params.checkIns.filter((c) => c.requestedDoctorContact);

  const deterministicSummary: AIReport['summary'] = {
    reportingPeriod: `${params.patient.dischargeOrProcedureDate.slice(0, 10)} dan joriy vaqtgacha`,
    medicationConfirmationSummary: `Jami ${params.medicationEvents.length} ta rejaviy dori hodisasidan: ${takenCount} tasi bemor tomonidan "Ichdim" deb tasdiqlangan, ${missedCount} tasi "O‘tkazib yubordim", ${unconfirmedCount} tasi "Tasdiqlanmagan" (Bemor o‘zi tasdiqlagan ma’lumot, klinik verifikatsiya emas).`,
    dailyCheckInResponses:
      params.checkIns.length > 0
        ? `Jami ${params.checkIns.length} ta kunlik check-in topshirilgan. So‘nggi holat (${latestCheckIn.submittedAt.slice(0, 16).replace('T', ' ')}): "${latestCheckIn.overallFeeling}"${latestCheckIn.bloodPressure ? `, AQB: ${latestCheckIn.bloodPressure}` : ''}.`
        : 'Hozircha kunlik check-in javoblari mavjud emas.',
    painScoreTrend:
      painScores.length > 0
        ? `Qayd etilgan og‘riq ko‘rsatkichlari: ${painScores.join(' -> ')}`
        : 'Og‘riq ko‘rsatkichi qayd etilmagan.',
    newReportedComplaints:
      latestCheckIn?.reportedSymptoms ||
      'Yangi bemor shikoyatlari qayd etilmagan.',
    followUpAppointmentStatus: params.careCase
      ? `Chiqarishdan keyingi 24 soatlik muddat: ${params.careCase.followUpDeadlineAt.slice(0, 16).replace('T', ' ')}. Holat: ${params.careCase.caseStatus}.`
      : 'Kuzatuv rejasi faol.',
    unansweredNotifications:
      unansweredNotifs.length > 0
        ? `${unansweredNotifs.length} ta xabarnoma javobsiz qolmoqda (${unansweredNotifs.map((n) => n.id).join(', ')}).`
        : 'Barcha yuborilgan eslatmalarga javob olingan.',
    requestsForDoctorContact:
      contactRequests.length > 0
        ? `Bemor ${contactRequests.length} marta shifokor bilan bog‘lanishni so‘ragan (${contactRequests.map((c) => c.id).join(', ')}).`
        : 'Shifokor bilan bog‘lanish bo‘yicha ochiq so‘rov yo‘q.',
    itemsRequiringManualReview: [
      ...(contactRequests.length > 0
        ? ['Bemorning shifokor bilan bog‘lanish so‘rovini ko‘rib chiqish']
        : []),
      ...(unconfirmedCount > 0 || missedCount > 0
        ? ['Tasdiqlanmagan yoki o‘tkazib yuborilgan dori qabuli holatlarini aniqlashtirish']
        : []),
      '24 soatlik birlamchi shifokor kuzatuvi bayonnomasini tasdiqlash',
    ],
    doctorEditableNotes: `AI tomonidan tayyorlangan loyiha (${params.doctorName} tekshiruvi uchun). Manba yozuvlar: ${sourceEventIds.join(', ')}.`,
  };

  const ai = getAiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Quyidagi bemor yozuvlari asosida shifokor uchun aniq, uydirmasiz qisqa xulosa tayyorlang (O‘zbek tilida):
Bemor: ${params.patient.fullName} (${params.patient.careCaseType})
Dori tasdiqlari: ${deterministicSummary.medicationConfirmationSummary}
Kunlik check-inlar: ${deterministicSummary.dailyCheckInResponses}
Shikoyatlar: ${deterministicSummary.newReportedComplaints}`,
        config: {
          systemInstruction:
            'Siz shifokor yordamchisi sifatida faqat taqdim etilgan bemor yozuvlarini umumlashtirasiz. Hech qanday yangi tashxis, o‘lchov yoki davolash uydirmang.',
        },
      });
      if (response.text) {
        deterministicSummary.doctorEditableNotes = `${response.text.trim()}\n\n[Manba yozuvlar: ${sourceEventIds.join(', ')}]`;
        return {
          summary: deterministicSummary,
          sourceEventIds,
          usedGemini: true,
        };
      }
    } catch {
      // Use deterministic traceable report
    }
  }

  return {
    summary: deterministicSummary,
    sourceEventIds,
    usedGemini: false,
  };
}
