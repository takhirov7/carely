import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { HeartPulse, Monitor, Moon, Sun } from 'lucide-react';

export type AppLanguage = 'uz' | 'ru' | 'uz_cyrl';
export type AppThemeMode = 'light' | 'dark' | 'system';

const DEFAULT_LANGUAGE: AppLanguage = 'uz';
const DEFAULT_THEME: AppThemeMode = 'light';

const LANG_STORAGE_KEY = 'carely_pref_lang_v1';
const THEME_STORAGE_KEY = 'carely_pref_theme_v1';

// Protected proper nouns (patient names, doctor names, medication names) that must NEVER be auto-translated
const PROTECTED_PROPER_NOUNS = [
  'Otabek Mahmudov',
  'Dilbar Yo‘ldosheva',
  'Shavkat Karimov',
  'Zulfiya Rustamova',
  'Murodjon Alimov',
  'Saida Nazarova',
  'Farhod Tursunov',
  'Nodira Usmonova',
  'Baxtiyor Qodirov',
  'Gulnoza Hasanova',
  'Jamshid Rahmonov',
  'Lola To‘xtayeva',
  'Sanjarbek Karimov',
  'Dr. Sardor Rahimov',
  'Dr. Malika Karimova',
  'Dr. Malika Tursunova',
  'Dr. Jahongir Ortiqov',
  'Dr. Nilufar Toshpo‘latova',
  'Dr. Kamola Rahimova',
  'Sardor Rahimov',
  'Malika Karimova',
  'Malika Tursunova',
  'Jahongir Ortiqov',
  'Nilufar Toshpo‘latova',
  'Aziza Rustamova',
  'Bekzod Yo‘ldoshev',
  'Demo-Kardio Plus',
  'Demo-Kardio A',
  'Demo-Trombo Stop',
  'Demo-Amoksi Forte',
  'Demo- Analgin',
  'Carely',
];

// Comprehensive UI translation dictionary (Exact phrase -> Russian & Uzbek Cyrillic)
export const UI_PHRASE_MAP: Record<string, { ru: string; uz_cyrl: string }> = {
  // Brand & Taglines
  'Davolanish tugasa ham, g‘amxo‘rlik davom etadi.': {
    ru: 'Лечение завершено, но забота продолжается.',
    uz_cyrl: 'Даволаниш тугаса ҳам, ғамхўрлик давом этади.',
  },
  '“Davolanish tugasa ham, g‘amxo‘rlik davom etadi.”': {
    ru: '«Лечение завершено, но забота продолжается.»',
    uz_cyrl: '«Даволаниш тугаса ҳам, ғамхўрлик давом этади.»',
  },
  'Davolanish va kuzatuv tizimi': {
    ru: 'Система лечения и наблюдения',
    uz_cyrl: 'Даволаниш ва кузатув тизими',
  },
  'Carely yuklanmoqda...': {
    ru: 'Загрузка Carely...',
    uz_cyrl: 'Carely юкланмоқда...',
  },
  "Demo rejimi — sun'iy ma'lumotlar": {
    ru: 'Демо-режим — синтетические данные',
    uz_cyrl: 'Демо режими — сунъий маълумотлар',
  },
  Demo: {
    ru: 'Демо',
    uz_cyrl: 'Демо',
  },
  Shifokor: {
    ru: 'Врач',
    uz_cyrl: 'Шифокор',
  },

  // Primary Navigation & Menus
  'Bosh sahifa': {
    ru: 'Главная',
    uz_cyrl: 'Бош саҳифа',
  },
  '1. Bosh sahifa': {
    ru: '1. Главная',
    uz_cyrl: '1. Бош саҳифа',
  },
  Bemorlar: {
    ru: 'Пациенты',
    uz_cyrl: 'Беморлар',
  },
  'Bemorlar va kuzatuvlar': {
    ru: 'Пациенты и наблюдение',
    uz_cyrl: 'Беморлар ва кузатувлар',
  },
  Vazifalar: {
    ru: 'Задачи',
    uz_cyrl: 'Вазифалар',
  },
  Xabarlar: {
    ru: 'Сообщения',
    uz_cyrl: 'Хабарлар',
  },
  '4. Xabarlar': {
    ru: '4. Сообщения',
    uz_cyrl: '4. Хабарлар',
  },
  Hisobotlar: {
    ru: 'Отчёты',
    uz_cyrl: 'Ҳисоботлар',
  },
  Shifokorlar: {
    ru: 'Врачи',
    uz_cyrl: 'Шифокорлар',
  },
  'Shifokorlar ro‘yxati': {
    ru: 'Список врачей',
    uz_cyrl: 'Шифокорлар рўйхати',
  },
  'Klinika sozlamalari': {
    ru: 'Настройки клиники',
    uz_cyrl: 'Клиника созламалари',
  },
  'Ko‘proq': {
    ru: 'Ещё',
    uz_cyrl: 'Кўпроқ',
  },
  'Ko‘proq bo‘limlar': {
    ru: 'Дополнительные разделы',
    uz_cyrl: 'Кўпроқ бўлимлар',
  },
  'Hisobotlar, shifokor profili va sozlamalar': {
    ru: 'Отчёты, профиль врача и настройки',
    uz_cyrl: 'Ҳисоботлар, шифокор профили ва созламалар',
  },
  'Mening profilim': {
    ru: 'Мой профиль',
    uz_cyrl: 'Менинг профилим',
  },
  'Profil (Shifokor kabineti)': {
    ru: 'Профиль (Кабинет врача)',
    uz_cyrl: 'Профиль (Шифокор кабинети)',
  },
  Sozlamalar: {
    ru: 'Настройки',
    uz_cyrl: 'Созламалар',
  },
  'Demo boshqaruvi': {
    ru: 'Управление демо',
    uz_cyrl: 'Демо бошқаруви',
  },
  Chiqish: {
    ru: 'Выйти',
    uz_cyrl: 'Чиқиш',
  },
  'Tariflar va Obuna': {
    ru: 'Тарифы и подписка',
    uz_cyrl: 'Тарифлар ва Обуна',
  },
  'Hackathon Demo Center': {
    ru: 'Центр демо-сценариев',
    uz_cyrl: 'Демо маркази',
  },
  'Chiqish / Rolni almashtirish': {
    ru: 'Выйти / Сменить роль',
    uz_cyrl: 'Чиқиш / Ролни алмаштириш',
  },
  'Bemorni uyga chiqarish': {
    ru: 'Выписать пациента',
    uz_cyrl: 'Беморни уйга чиқариш',
  },
  'Bemorni uyga chiqarish (24s vazifa)': {
    ru: 'Выписать пациента (задача 24ч)',
    uz_cyrl: 'Беморни уйга чиқариш (24с вазифа)',
  },
  '+ Bemorni uyga chiqarish (24s vazifa)': {
    ru: '+ Выписать пациента (задача 24ч)',
    uz_cyrl: '+ Беморни уйга чиқариш (24с вазифа)',
  },

  // Doctor Home Dashboard
  'Assalomu alaykum, doktor!': {
    ru: 'Здравствуйте, доктор!',
    uz_cyrl: 'Ассалому алайкум, доктор!',
  },
  '+ Bemor qo‘shish': {
    ru: '+ Добавить пациента',
    uz_cyrl: '+ Бемор қўшиш',
  },
  'Aktiv bemorlar': {
    ru: 'Активные пациенты',
    uz_cyrl: 'Актив беморлар',
  },
  'Hozir kuzatuvda': {
    ru: 'Сейчас под наблюдением',
    uz_cyrl: 'Ҳозир кузатувда',
  },
  'Bugungi vazifalar': {
    ru: 'Задачи на сегодня',
    uz_cyrl: 'Бугунги вазифалар',
  },
  'Bugun bajarilishi kerak': {
    ru: 'Необходимо выполнить сегодня',
    uz_cyrl: 'Бугун бажарилиши керак',
  },
  'Yangi xabarlar': {
    ru: 'Новые сообщения',
    uz_cyrl: 'Янги хабарлар',
  },
  'Bemorlardan kelgan': {
    ru: 'От пациентов',
    uz_cyrl: 'Беморлардан келган',
  },
  'Ko‘rib chiqish kerak': {
    ru: 'Требует внимания',
    uz_cyrl: 'Кўриб чиқиш керак',
  },
  "Shifokor e'tibori zarur": {
    ru: 'Требуется осмотр врача',
    uz_cyrl: 'Шифокор эътибори зарур',
  },
  'Bugungi eng muhim vazifalar': {
    ru: 'Важнейшие задачи на сегодня',
    uz_cyrl: 'Бугунги энг муҳим вазифалар',
  },
  'Shoshilinch ko‘rib chiqish va 24 soatlik shifoxonadan keyingi kuzatuvlar': {
    ru: 'Срочные обращения и 24-часовое наблюдение после выписки',
    uz_cyrl: 'Шошилинч кўриб чиқиш ва 24 соатлик шифохонадан кейинги кузатувлар',
  },
  'Bemorni ko‘rish': {
    ru: 'Открыть пациента',
    uz_cyrl: 'Беморни кўриш',
  },
  'So‘nggi bemor xabarlari': {
    ru: 'Последние сообщения пациентов',
    uz_cyrl: 'Сўнгги бемор хабарлари',
  },
  "Bemorlardan kelgan oxirgi holat ma'lumotlari va murojaatlar": {
    ru: 'Последние отчёты о самочувствии и обращения пациентов',
    uz_cyrl: 'Беморлардан келган охирги ҳолат маълумотлари ва мурожаатлар',
  },
  'Barchasini ko‘rish': {
    ru: 'Смотреть все',
    uz_cyrl: 'Барчасини кўриш',
  },
  Barchasi: {
    ru: 'Все',
    uz_cyrl: 'Барчаси',
  },

  // Patient List Page
  'Sizga biriktirilgan bemorlar': {
    ru: 'Закреплённые за вами пациенты',
    uz_cyrl: 'Сизга бириктирилган беморлар',
  },
  'Bemor ismi yoki ID bo‘yicha qidirish': {
    ru: 'Поиск по имени или ID пациента',
    uz_cyrl: 'Бемор исми ёки ID бўйича қидириш',
  },
  'Qo‘shimcha filtrlar': {
    ru: 'Дополнительные фильтры',
    uz_cyrl: 'Қўшимча фильтрлар',
  },
  'Shifokor bo‘yicha filtrlash': {
    ru: 'Фильтр по врачу',
    uz_cyrl: 'Шифокор бўйича фильтрлаш',
  },
  'Barcha shifokorlar': {
    ru: 'Все врачи',
    uz_cyrl: 'Барча шифокорлар',
  },
  'Tibbiy yo‘nalish bo‘yicha': {
    ru: 'По медицинскому направлению',
    uz_cyrl: 'Тиббий йўналиш бўйича',
  },
  'Barcha yo‘nalishlar': {
    ru: 'Все направления',
    uz_cyrl: 'Барча йўналишлар',
  },
  Jarrohlik: {
    ru: 'Хирургия',
    uz_cyrl: 'Жарроҳлик',
  },
  Kardiologiya: {
    ru: 'Кардиология',
    uz_cyrl: 'Кардиология',
  },
  Terapiya: {
    ru: 'Терапия',
    uz_cyrl: 'Терапия',
  },
  Stomatologiya: {
    ru: 'Стоматология',
    uz_cyrl: 'Стоматология',
  },
  Pediatriya: {
    ru: 'Педиатрия',
    uz_cyrl: 'Педиатрия',
  },
  'Faol kuzatuvda': {
    ru: 'Активное наблюдение',
    uz_cyrl: 'Фаол кузатувда',
  },
  'Kuzatuv yakunlangan': {
    ru: 'Наблюдение завершено',
    uz_cyrl: 'Кузатув якунланган',
  },
  '1. Bemor': {
    ru: '1. Пациент',
    uz_cyrl: '1. Бемор',
  },
  '2. So‘nggi holat': {
    ru: '2. Последнее состояние',
    uz_cyrl: '2. Сўнгги ҳолат',
  },
  '3. Keyingi vazifa': {
    ru: '3. Следующая задача',
    uz_cyrl: '3. Кейинги вазифа',
  },
  '4. Status': {
    ru: '4. Статус',
    uz_cyrl: '4. Статус',
  },
  '5. Harakat': {
    ru: '5. Действие',
    uz_cyrl: '5. Ҳаракат',
  },
  'Rejali dori nazorati': {
    ru: 'Плановый контроль приёма лекарств',
    uz_cyrl: 'Режали дори назорати',
  },
  'Kuzatuv boshlangan': {
    ru: 'Наблюдение начато',
    uz_cyrl: 'Кузатув бошланган',
  },
  'Qidiruv bo‘yicha bemor topilmadi': {
    ru: 'Пациенты по запросу не найдены',
    uz_cyrl: 'Қидирув бўйича бемор топилмади',
  },
  'Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalang.': {
    ru: 'Измените поисковый запрос или сбросьте фильтры.',
    uz_cyrl: 'Қидирув сўзини ўзгартиринг ёки фильтрларни тозаланг.',
  },
  'Filtrlarni tozalash': {
    ru: 'Сбросить фильтры',
    uz_cyrl: 'Фильтрларни тозалаш',
  },

  // Patient Profile & Tabs
  Orqaga: {
    ru: 'Назад',
    uz_cyrl: 'Орқага',
  },
  'Bemor bilan bog‘lanish': {
    ru: 'Связаться с пациентом',
    uz_cyrl: 'Бемор билан боғланиш',
  },
  'Holatini qayd etish': {
    ru: 'Записать состояние',
    uz_cyrl: 'Ҳолатини қайд этиш',
  },
  'Kuzatuvni yakunlash': {
    ru: 'Завершить наблюдение',
    uz_cyrl: 'Кузатувни якунлаш',
  },
  '1. Bemor va aloqa': {
    ru: '1. Пациент и контакты',
    uz_cyrl: '1. Бемор ва алоқа',
  },
  '2. Nima uchun kuzatilmoqda': {
    ru: '2. Причина наблюдения',
    uz_cyrl: '2. Нима учун кузатилмоқда',
  },
  '3. Bemorning so‘nggi holati': {
    ru: '3. Последнее состояние',
    uz_cyrl: '3. Беморнинг сўнгги ҳолати',
  },
  '4. Keyingi zarur harakat': {
    ru: '4. Следующее действие',
    uz_cyrl: '4. Кейинги зарур ҳаракат',
  },
  'Kunlik check-in hali yuborilmagan': {
    ru: 'Дневной отчёт ещё не отправлен',
    uz_cyrl: 'Кунлик check-in ҳали юборилмаган',
  },
  'Rejali dori va holat kuzatuvi': {
    ru: 'Плановый контроль лекарств и состояния',
    uz_cyrl: 'Режали дори ва ҳолат кузатуви',
  },
  '1. Umumiy': {
    ru: '1. Общее',
    uz_cyrl: '1. Умумий',
  },
  Umumiy: {
    ru: 'Общее',
    uz_cyrl: 'Умумий',
  },
  '2. Dori rejasi': {
    ru: '2. План лекарств',
    uz_cyrl: '2. Дори режаси',
  },
  Dorilar: {
    ru: 'Лекарства',
    uz_cyrl: 'Дорилар',
  },
  Dorilarim: {
    ru: 'Мои лекарства',
    uz_cyrl: 'Дориларим',
  },
  '2. Dorilarim': {
    ru: '2. Мои лекарства',
    uz_cyrl: '2. Дориларим',
  },
  '3. Kunlik holat': {
    ru: '3. Дневное состояние',
    uz_cyrl: '3. Кунлик ҳолат',
  },
  'Kunlik holat': {
    ru: 'Состояние',
    uz_cyrl: 'Кунлик ҳолат',
  },
  '4. Tarix va qaydlar': {
    ru: '4. История и записи',
    uz_cyrl: '4. Тарих ва қайдлар',
  },
  Tarix: {
    ru: 'История',
    uz_cyrl: 'Тарих',
  },
  'Joriy davolanish va kuzatuv rejasi': {
    ru: 'Текущий план лечения и наблюдения',
    uz_cyrl: 'Жорий даволаниш ва кузатув режаси',
  },
  'Chiqarish / Kuzatuv rejasini yangilash': {
    ru: 'Обновить выписку / план наблюдения',
    uz_cyrl: 'Чиқариш / Кузатув режасини янгилаш',
  },
  'Klinik tashxis / Muolaja xulosasi': {
    ru: 'Клинический диагноз / выписной эпикриз',
    uz_cyrl: 'Клиник ташхис / Муолажа хулосаси',
  },
  'Shifokor ko‘rsatmalari (Bemor uchun)': {
    ru: 'Рекомендации врача (для пациента)',
    uz_cyrl: 'Шифокор кўрсатмалари (Бемор учун)',
  },
  'Chiqarilgan sana': {
    ru: 'Дата выписки',
    uz_cyrl: 'Чиқарилган сана',
  },
  'Navbatdagi shifokor ko‘rigi': {
    ru: 'Следующий осмотр врача',
    uz_cyrl: 'Навбатдаги шифокор кўриги',
  },
  "Bemor ma'lumotlari": {
    ru: 'Данные пациента',
    uz_cyrl: 'Бемор маълумотлари',
  },
  'Tug‘ilgan sana:': {
    ru: 'Дата рождения:',
    uz_cyrl: 'Туғилган сана:',
  },
  'Telefon:': {
    ru: 'Телефон:',
    uz_cyrl: 'Телефон:',
  },
  'Manzil:': {
    ru: 'Адрес:',
    uz_cyrl: 'Манзил:',
  },
  'Muassasa:': {
    ru: 'Учреждение:',
    uz_cyrl: 'Муассаса:',
  },
  'Vakolatli qarindosh:': {
    ru: 'Уполномоченный родственник:',
    uz_cyrl: 'Ваколатли қариндош:',
  },
  Biriktirilmagan: {
    ru: 'Не назначен',
    uz_cyrl: 'Бириктирилмаган',
  },

  // Tasks & 24h Workflow
  'Vazifalar va 24 Soatlik Kuzatuvlar': {
    ru: 'Задачи и 24-часовое наблюдение',
    uz_cyrl: 'Вазифалар ва 24 Соатлик Кузатувлар',
  },
  'Shifoxonadan chiqarilgan bemorlar bilan 24 soat ichida bog‘lanish va rejali vazifalar': {
    ru: 'Связь с выписанными пациентами в течение 24 часов и плановые задачи',
    uz_cyrl: 'Шифохонадан чиқарилган беморлар билан 24 соат ичида боғланиш ва режали вазифалар',
  },
  'Barcha vazifalar': {
    ru: 'Все задачи',
    uz_cyrl: 'Барча вазифалар',
  },
  'Yangi vazifalar': {
    ru: 'Новые задачи',
    uz_cyrl: 'Янги вазифалар',
  },
  '24 soatlik shifoxonadan keyingi': {
    ru: '24ч после стационара',
    uz_cyrl: '24 соатлик шифохонадан кейинги',
  },
  Bajarilgan: {
    ru: 'Выполненные',
    uz_cyrl: 'Бажарилган',
  },
  'Shifoxonadan keyingi birinchi kuzatuv (24 soatlik vazifa)': {
    ru: 'Первое наблюдение после стационара (задача 24 часа)',
    uz_cyrl: 'Шифохонадан кейинги биринчи кузатув (24 соатлик вазифа)',
  },
  "1. Bemor ma'lumotini ko‘rish": {
    ru: '1. Изучить карту пациента',
    uz_cyrl: '1. Бемор маълумотини кўриш',
  },
  '2. Bemor bilan bog‘lanish': {
    ru: '2. Связаться с пациентом',
    uz_cyrl: '2. Бемор билан боғланиш',
  },
  '3. Natijani qayd etish': {
    ru: '3. Записать результат',
    uz_cyrl: '3. Натижани қайд этиш',
  },
  '4. Kuzatuvni yakunlash': {
    ru: '4. Завершить наблюдение',
    uz_cyrl: '4. Кузатувни якунлаш',
  },
  'Vazifani qabul qilish': {
    ru: 'Принять задачу',
    uz_cyrl: 'Вазифани қабул қилиш',
  },
  'Kuzatuv natijasini yozish': {
    ru: 'Записать результат наблюдения',
    uz_cyrl: 'Кузатув натижасини ёзиш',
  },
  'Muloqot usuli': {
    ru: 'Способ связи',
    uz_cyrl: 'Мулоқот усули',
  },
  'Telefon muloqoti': {
    ru: 'Телефонный звонок',
    uz_cyrl: 'Телефон мулоқоти',
  },
  'Uyga tashrif (Patronaj)': {
    ru: 'Визит на дом (Патронаж)',
    uz_cyrl: 'Уйга ташриф (Патронаж)',
  },
  'Poliklinikada qabul': {
    ru: 'Приём в поликлинике',
    uz_cyrl: 'Поликлиникада қабул',
  },
  'Video konsultatsiya': {
    ru: 'Видеоконсультация',
    uz_cyrl: 'Видео консультация',
  },
  'Bemor telefoni': {
    ru: 'Телефон пациента',
    uz_cyrl: 'Бемор телефони',
  },
  'Kuzatuv natijasi va shifokor xulosasi': {
    ru: 'Результат наблюдения и заключение врача',
    uz_cyrl: 'Кузатув натижаси ва шифокор хулосаси',
  },
  'Qayd qo‘shish': {
    ru: 'Добавить заметку',
    uz_cyrl: 'Қайд қўшиш',
  },
  '+ Qayd qo‘shish': {
    ru: '+ Добавить заметку',
    uz_cyrl: '+ Қайд қўшиш',
  },
  'Shifokor qaydini qo‘shish': {
    ru: 'Добавить заметку врача',
    uz_cyrl: 'Шифокор қайдини қўшиш',
  },
  '1. Bemorning so‘nggi holati va shikoyatlari': {
    ru: '1. Последнее состояние и жалобы пациента',
    uz_cyrl: '1. Беморнинг сўнгги ҳолати ва шикоятлари',
  },
  '2. Shifokor e’tiborini talab qiladigan holatlar': {
    ru: '2. Вопросы, требующие внимания врача',
    uz_cyrl: '2. Шифокор эътиборини талаб қиладиган ҳолатлар',
  },
  '3. Dori jadvali va qabul tasdiqlari': {
    ru: '3. Расписание лекарств и подтверждения приёма',
    uz_cyrl: '3. Дори жадвали ва қабул тасдиқлари',
  },
  '4. Keyingi uchrashuv va kuzatuv vazifasi': {
    ru: '4. Следующий приём и задача наблюдения',
    uz_cyrl: '4. Кейинги учрашув ва кузатув вазифаси',
  },
  'Barcha dorilar →': {
    ru: 'Все лекарства →',
    uz_cyrl: 'Барча дорилар →',
  },
  'Bajarildi deb belgilash': {
    ru: 'Отметить как выполненное',
    uz_cyrl: 'Бажарилди деб белгилаш',
  },
  'Qo‘shimcha klinik va aloqa ma’lumotlari (Tashxis, ko‘rsatmalar, manzil)': {
    ru: 'Дополнительные клинические и контактные данные (Диагноз, инструкции, адрес)',
    uz_cyrl: 'Қўшимча клиник ва алоқа маълумотлари (Ташхис, кўрсатмалар, манзил)',
  },
  Bugungi: {
    ru: 'Сегодняшние',
    uz_cyrl: 'Бугунги',
  },
  Kutilayotgan: {
    ru: 'Ожидающие',
    uz_cyrl: 'Кутилаётган',
  },
  'Ko‘rish': {
    ru: 'Открыть',
    uz_cyrl: 'Кўриш',
  },
  'Ko‘rish →': {
    ru: 'Открыть →',
    uz_cyrl: 'Кўриш →',
  },
  'Vazifa tavsifi': {
    ru: 'Описание задачи',
    uz_cyrl: 'Вазифа тавсифи',
  },
  '← Vazifalar ro‘yxatiga qaytish': {
    ru: '← Назад к списку задач',
    uz_cyrl: '← Вазифалар рўйхатига қайтиш',
  },
  'Vazifa va muddat': {
    ru: 'Задача и срок',
    uz_cyrl: 'Вазифа ва муддат',
  },
  'Vazifa tavsifi va ko‘rsatma': {
    ru: 'Описание задачи и инструкция',
    uz_cyrl: 'Вазифа тавсифи ва кўрсатма',
  },
  'Kuzatuv natijasini qayd etish': {
    ru: 'Записать результат наблюдения',
    uz_cyrl: 'Кузатув натижасини қайд этиш',
  },
  'Shifokor xulosasi (ixtiyoriy)': {
    ru: 'Заключение врача (необязательно)',
    uz_cyrl: 'Шифокор хулосаси (ихтиёрий)',
  },
  'Bemorlar bilan chat': {
    ru: 'Чат с пациентами',
    uz_cyrl: 'Беморлар билан чат',
  },
  'AI xabarlari': {
    ru: 'Сообщения ИИ',
    uz_cyrl: 'AI хабарлари',
  },
  'Bemorga yozishga ruxsat berish': {
    ru: 'Разрешить пациенту писать сообщения',
    uz_cyrl: 'Беморга ёзишга рухсат бериш',
  },
  'Bemor yoza oladi': {
    ru: 'Пациент может писать',
    uz_cyrl: 'Бемор ёза олади',
  },
  'Faqat shifokor yoza oladi': {
    ru: 'Писать может только врач',
    uz_cyrl: 'Фақат шифокор ёза олади',
  },
  'Shifokoringiz hozircha xabar yozishga ruxsat bermagan.': {
    ru: 'Ваш врач пока не открыл разрешение на отправку сообщений.',
    uz_cyrl: 'Шифокорингиз ҳозирча хабар ёзишга рухсат бермаган.',
  },
  'Xabar yozish ruxsati yangilandi.': {
    ru: 'Разрешение на отправку сообщений обновлено.',
    uz_cyrl: 'Хабар ёзиш рухсати янгиланди.',
  },
  'Bu chat shoshilinch tibbiy yordam uchun mo‘ljallanmagan.': {
    ru: 'Этот чат не предназначен для экстренной медицинской помощи.',
    uz_cyrl: 'Бу чат шошилинч тиббий ёрдам учун мўлжалланмаган.',
  },
  'ON (Ruxsat berilgan)': {
    ru: 'ВКЛ (Разрешено)',
    uz_cyrl: 'ON (Рухсат берилган)',
  },
  'OFF (Yopiq)': {
    ru: 'ВЫКЛ (Закрыто)',
    uz_cyrl: 'OFF (Ёпиқ)',
  },
  'Kuzatuvi kechikkanlar': {
    ru: 'Просроченные наблюдения',
    uz_cyrl: 'Кузатуви кечикканлар',
  },
  'Bemorlarning javob berish darajasi': {
    ru: 'Уровень ответов пациентов',
    uz_cyrl: 'Беморларнинг жавоб бериш даражаси',
  },
  'AI hisobot yaratish': {
    ru: 'Создать ИИ-отчёт',
    uz_cyrl: 'AI ҳисобот яратиш',
  },
  'AI tomonidan tayyorlangan — shifokor tekshirishi kerak.': {
    ru: 'Подготовлено ИИ — требуется проверка врача.',
    uz_cyrl: 'AI томонидан тайёрланган — шифокор текшириши керак.',
  },
  'Bemorlar monitoringi qisqacha jadvali': {
    ru: 'Краткая таблица мониторинга пациентов',
    uz_cyrl: 'Беморлар мониторинги қисқача жадвали',
  },
  'Haftalik kuzatuv va dori tasdig‘i dinamikasi': {
    ru: 'Недельная динамика наблюдений и приёма лекарств',
    uz_cyrl: 'Ҳафталик кузатув ва дори тасдиғи динамикаси',
  },

  // Patient Portal & Medications
  'Bugungi dori jadvali': {
    ru: 'Расписание приёма лекарств на сегодня',
    uz_cyrl: 'Бугунги дори жадвали',
  },
  'Bugungi dorilarim': {
    ru: 'Мои лекарства на сегодня',
    uz_cyrl: 'Бугунги дориларим',
  },
  'Navbatdagi dori eslatmasi': {
    ru: 'Следующее напоминание о лекарстве',
    uz_cyrl: 'Навбатдаги дори эслатмаси',
  },
  'Dorilarimni ko‘rish va tasdiqlash': {
    ru: 'Просмотреть и подтвердить лекарства',
    uz_cyrl: 'Дориларимни кўриш ва тасдиқлаш',
  },
  'Bugungi salomatlik holati': {
    ru: 'Самочувствие на сегодня',
    uz_cyrl: 'Бугунги саломатлик ҳолати',
  },
  'Bugungi so‘rovnoma kutilmoqda': {
    ru: 'Ожидается сегодняшний опрос',
    uz_cyrl: 'Бугунги сўровнома кутилмоқда',
  },
  '4 ta oddiy savolga javob bering': {
    ru: 'Ответьте на 4 простых вопроса',
    uz_cyrl: '4 та оддий саволга жавоб беринг',
  },
  'Navbatdagi shifokor uchrashuvi / ko‘rigi': {
    ru: 'Следующий приём / осмотр врача',
    uz_cyrl: 'Навбатдаги шифокор учрашуви / кўриги',
  },
  'Savolingiz bo‘lsa, tibbiyot xodimi bilan bog‘lanish so‘rovini yuboring.': {
    ru: 'Если у вас есть вопросы, отправьте запрос на связь с медперсоналом.',
    uz_cyrl: 'Саволингиз бўлса, тиббиёт ходими билан боғланиш сўровини юборинг.',
  },
  '✓ Ichdim': {
    ru: '✓ Принял(а)',
    uz_cyrl: '✓ Ичдим',
  },
  Ichdim: {
    ru: 'Принял(а)',
    uz_cyrl: 'Ичдим',
  },
  Keyinroq: {
    ru: 'Позже',
    uz_cyrl: 'Кейинроқ',
  },
  'O‘tkazib yubordim': {
    ru: 'Пропустил(а)',
    uz_cyrl: 'Ўтказиб юбордим',
  },
  Tasdiqlanmagan: {
    ru: 'Не подтверждено',
    uz_cyrl: 'Тасдиқланмаган',
  },
  'Kunlik holatni yuborish': {
    ru: 'Отправить дневное состояние',
    uz_cyrl: 'Кунлик ҳолатни юбориш',
  },
  'Shifokor bilan bog‘lanish': {
    ru: 'Связаться с врачом',
    uz_cyrl: 'Шифокор билан боғланиш',
  },
  'Carely Virtual Yordamchi bilan suhbat': {
    ru: 'Беседа с виртуальным помощником Carely',
    uz_cyrl: 'Carely Виртуал Ёрдамчи билан суҳбат',
  },
  'AI muloqotni ochish': {
    ru: 'Открыть ИИ-диалог',
    uz_cyrl: 'AI мулоқотни очиш',
  },

  // Statuses & Roles
  'Aktiv kuzatuvda': {
    ru: 'Активное наблюдение',
    uz_cyrl: 'Актив кузатувда',
  },
  'Shifokor ko‘rishi kerak': {
    ru: 'Требуется осмотр врача',
    uz_cyrl: 'Шифокор кўриши керак',
  },
  'Oilaviy shifokor biriktirilgan': {
    ru: 'Назначен семейный врач',
    uz_cyrl: 'Оилавий шифокор бириктирилган',
  },
  Yakunlangan: {
    ru: 'Завершено',
    uz_cyrl: 'Якунланган',
  },
  Arxivlangan: {
    ru: 'В архиве',
    uz_cyrl: 'Архивланган',
  },
  'Yangi vazifa': {
    ru: 'Новая задача',
    uz_cyrl: 'Янги вазифа',
  },
  Yangi: {
    ru: 'Новая',
    uz_cyrl: 'Янги',
  },
  'Qabul qilindi': {
    ru: 'Принято',
    uz_cyrl: 'Қабул қилинди',
  },
  Jarayonda: {
    ru: 'В процессе',
    uz_cyrl: 'Жараёнда',
  },
  Bajarildi: {
    ru: 'Выполнено',
    uz_cyrl: 'Бажарилди',
  },
  'Muddati o‘tgan': {
    ru: 'Просрочено',
    uz_cyrl: 'Муддати ўтган',
  },
  'Javob berildi': {
    ru: 'Проверено врачом',
    uz_cyrl: 'Жавоб берилди',
  },
  Kutilmoqda: {
    ru: 'Ожидается',
    uz_cyrl: 'Кутилмоқда',
  },
  '24 soatlik oilaviy shifokor kuzatuvi': {
    ru: '24-часовое наблюдение семейного врача',
    uz_cyrl: '24 соатлик оилавий шифокор кузатуви',
  },
  'Rejali shifokor ko‘rigi': {
    ru: 'Плановый осмотр врача',
    uz_cyrl: 'Режали шифокор кўриги',
  },
  'Shoshilinch murojaat tekshiruvi': {
    ru: 'Проверка срочного обращения',
    uz_cyrl: 'Шошилинч мурожаат текшируви',
  },
  'Platforma Super Admini': {
    ru: 'Суперадминистратор платформы',
    uz_cyrl: 'Платформа Супер Админи',
  },
  'Shifoxona / Klinika Admini': {
    ru: 'Администратор клиники',
    uz_cyrl: 'Шифохона / Клиника Админи',
  },
  'Davolovchi shifokor': {
    ru: 'Лечащий врач',
    uz_cyrl: 'Даволовчи шифокор',
  },
  'Hududiy oilaviy shifokor': {
    ru: 'Участковый семейный врач',
    uz_cyrl: 'Ҳудудий оилавий шифокор',
  },
  'Hamshira / Kuzatuv koordinatori': {
    ru: 'Медсестра / Координатор наблюдения',
    uz_cyrl: 'Ҳамшира / Кузатув координатори',
  },
  Bemor: {
    ru: 'Пациент',
    uz_cyrl: 'Бемор',
  },
  'Vakolatli qarindosh (Caregiver)': {
    ru: 'Уполномоченный родственник',
    uz_cyrl: 'Ваколатли қариндош',
  },

  // Settings & Theme
  'Shaxsiy va Klinika Sozlamalari': {
    ru: 'Личные настройки и параметры клиники',
    uz_cyrl: 'Шахсий ва Клиника Созламалари',
  },
  'Foydalanuvchi profili, til va xabarnoma qoidalari': {
    ru: 'Профиль пользователя, язык интерфейса, тема и правила уведомлений',
    uz_cyrl: 'Фойдаланувчи профили, тил ва хабарнома қоидалари',
  },
  "Shaxsiy hisob ma'lumotlari": {
    ru: 'Данные личного аккаунта',
    uz_cyrl: 'Шахсий ҳисоб маълумотлари',
  },
  'Foydalanuvchi:': {
    ru: 'Пользователь:',
    uz_cyrl: 'Фойдаланувчи:',
  },
  'Tizimdagi rol:': {
    ru: 'Роль в системе:',
    uz_cyrl: 'Тизимдаги роль:',
  },
  'Til:': {
    ru: 'Язык:',
    uz_cyrl: 'Тил:',
  },
  'Ko‘rinish:': {
    ru: 'Оформление:',
    uz_cyrl: 'Кўриниш:',
  },
  Kunduzgi: {
    ru: 'Дневной (Светлая)',
    uz_cyrl: 'Кундузги',
  },
  Tungi: {
    ru: 'Ночной (Тёмная)',
    uz_cyrl: 'Тунги',
  },
  'Tizim bo‘yicha': {
    ru: 'Системный',
    uz_cyrl: 'Тизим бўйича',
  },
  'Vaqt mintaqasi:': {
    ru: 'Часовой пояс:',
    uz_cyrl: 'Вақт минтақаси:',
  },
  'Klinika xabarnoma va xavfsizlik qoidalari': {
    ru: 'Правила уведомлений и безопасности клиники',
    uz_cyrl: 'Клиника хабарнома ва хавфсизлик қоидалари',
  },
  'SMS eslatmalar moduli:': {
    ru: 'Модуль SMS-напоминаний:',
    uz_cyrl: 'SMS эслатмалар модули:',
  },
  'Faol (Simulyatsiya)': {
    ru: 'Активен (Симуляция)',
    uz_cyrl: 'Фаол (Симуляция)',
  },
  'AI ovozli yordamchi:': {
    ru: 'Голосовой ИИ-помощник:',
    uz_cyrl: 'AI овозли ёрдамчи:',
  },
  'Faol (Rozilik asosida)': {
    ru: 'Активен (По согласию)',
    uz_cyrl: 'Фаол (Розилик асосида)',
  },
  'Tinchlik soatlari:': {
    ru: 'Тихие часы:',
    uz_cyrl: 'Тинчлик соатлари:',
  },

  // Reports & Analytics
  'Hisobotlar va Ko‘rsatkichlar': {
    ru: 'Отчёты и показатели',
    uz_cyrl: 'Ҳисоботлар ва Кўрсаткичлар',
  },
  'Bemorlar kuzatuvi samaradorligi, dori qabuli statistikasi va AI shifokor hisobotlari': {
    ru: 'Эффективность наблюдения пациентов, статистика приёма лекарств и ИИ-отчёты врачей',
    uz_cyrl: 'Беморлар кузатуви самарадорлиги, дори қабули статистикаси ва AI шифокор ҳисоботлари',
  },
  'Jami bemorlar': {
    ru: 'Всего пациентов',
    uz_cyrl: 'Жами беморлар',
  },
  'Klinika va poliklinika bo‘yicha': {
    ru: 'По клинике и поликлинике',
    uz_cyrl: 'Клиника ва поликлиника бўйича',
  },
  'Bajarilgan kuzatuvlar': {
    ru: 'Выполненные наблюдения',
    uz_cyrl: 'Бажарилган кузатувлар',
  },
  '24 soatlik va rejali vazifalar': {
    ru: '24-часовые и плановые задачи',
    uz_cyrl: '24 соатлик ва режали вазифалар',
  },
  'Tasdiqlangan dorilar': {
    ru: 'Подтверждённые лекарства',
    uz_cyrl: 'Тасдиқланган дорилар',
  },
  'AI hisobotlar': {
    ru: 'ИИ-отчёты',
    uz_cyrl: 'AI ҳисоботлар',
  },
  'Shifokor tekshiruvi uchun': {
    ru: 'Для проверки врачом',
    uz_cyrl: 'Шифокор текшируви учун',
  },
  'Haftalik dori qabuli tasdig‘i dinamikasi': {
    ru: 'Недельная динамика подтверждения приёма лекарств',
    uz_cyrl: 'Ҳафталик дори қабули тасдиғи динамикаси',
  },
  'AI tomonidan tayyorlangan loyiha — shifokor tekshirishi kerak.': {
    ru: 'Черновик подготовлен ИИ — требуется проверка врача.',
    uz_cyrl: 'AI томонидан тайёрланган лойиҳа — шифокор текшириши керак.',
  },
  'Shifokor tomonidan tasdiqlangan': {
    ru: 'Подтверждено врачом',
    uz_cyrl: 'Шифокор томонидан тасдиқланган',
  },
  'Shifokor ko‘rigi kutilmoqda': {
    ru: 'Ожидает проверки врача',
    uz_cyrl: 'Шифокор кўриги кутилмоқда',
  },
  'Dori qabuli tasdig‘i:': {
    ru: 'Подтверждение приёма лекарств:',
    uz_cyrl: 'Дори қабули тасдиғи:',
  },
  'Kunlik holat va og‘riq:': {
    ru: 'Дневное состояние и боль:',
    uz_cyrl: 'Кунлик ҳолат ва оғриқ:',
  },
  'Shifokor qaydi:': {
    ru: 'Запись врача:',
    uz_cyrl: 'Шифокор қайди:',
  },
  'Chop etish / PDF': {
    ru: 'Печать / PDF',
    uz_cyrl: 'Чоп этиш / PDF',
  },
  'Yangi AI hisobot yaratish': {
    ru: 'Создать новый ИИ-отчёт',
    uz_cyrl: 'Янги AI ҳисобот яратиш',
  },
  Yopish: {
    ru: 'Закрыть',
    uz_cyrl: 'Ёпиш',
  },
  'Bekor qilish': {
    ru: 'Отмена',
    uz_cyrl: 'Бекор қилиш',
  },
  Saqlash: {
    ru: 'Сохранить',
    uz_cyrl: 'Сақлаш',
  },
};

// Comprehensive Russian pattern translator for dynamic strings & sentences
const RU_FRAGMENT_REPLACEMENTS: [RegExp, string][] = [
  [/Bugun sizning e'tiboringizni talab qiladigan vazifalar/g, 'Задачи, требующие вашего внимания сегодня'],
  [/Shifokorlar va Klinika Boshqaruvi/g, 'Врачи и управление клиникой'],
  [/Tibbiyot xodimlari, ish jadvallari va ixtisoslashgan kuzatuv shablonlari/g, 'Медицинский персонал, графики работы и специализированные шаблоны наблюдения'],
  [/\+ Shifokor qo‘shish/g, '+ Добавить врача'],
  [/Diqqat talab qiladigan bemorlar/g, 'Пациенты, требующие внимания'],
  [/Xabarlar va Bildirishnomalar/g, 'Сообщения и уведомления'],
  [/Bemor murojaatlari, AI suhbat xulosalari va SMS eslatmalar boshqaruvi/g, 'Обращения пациентов, сводки ИИ-диалогов и управление SMS-напоминаниями'],
  [/1\. Harakat talab qilinadi/g, '1. Требуется действие'],
  [/2\. Yangi xabarlar va AI muloqotlar/g, '2. Новые сообщения и ИИ-диалоги'],
  [/3\. Oddiy bildirishnomalar \(SMS\)/g, '3. Обычные уведомления (SMS)'],
  [/Tavsiya etilgan keyingi amal: Bemor profilini ochib, bog‘lanish va holatini tekshirish\./g, 'Рекомендуемое действие: открыть профиль пациента, связаться и проверить состояние.'],
  [/Bemorga test SMS eslatma yuborish \(Simulyatsiya\)/g, 'Отправить тестовое SMS-напоминание пациенту (Симуляция)'],
  [/SMS eslatma yuborish/g, 'Отправить SMS-напоминание'],
  [/Dori eslatmasi/g, 'Напоминание о лекарстве'],
  [/Uchrashuv eslatmasi/g, 'Напоминание о приёме'],
  [/Kunlik holat so‘rovi/g, 'Запрос дневного состояния'],
  [/Bemor shifokor aloqasini so‘radi/g, 'Пациент запросил связь с врачом'],
  [/Muddati o‘tgan kuzatuv ogohlantirishi/g, 'Предупреждение о просроченном наблюдении'],
  [/Shifokor kuzatuv topshirig‘i/g, 'Задача наблюдения врача'],
  [/Simulyatsiya demo qo‘ng‘irog‘i/g, 'Демо-звонок (симуляция)'],
  [/Shifokor bilan bog‘lanish so‘raldi/g, 'Запрошена связь с врачом'],
  [/Javob olindi/g, 'Ответ получен'],
  [/ta tasdiqlanmagan/g, 'не подтверждено'],
  [/AI tomonidan tayyorlangan shifokor hisobotlari/g, 'ИИ-отчёты для врача'],
  [/Bemorlar tomonidan “Ichdim”, “Kutilmoqda” va “O‘tkazib yubordim” deb belgilangan dorilar soni/g, 'Количество приёмов лекарств со статусами «Принял», «Ожидается» и «Пропустил»'],
  [/Barcha vazifalar/g, 'Все задачи'],
  [/Yangi vazifalar/g, 'Новые задачи'],
  [/24 soatlik shifoxonadan keyingi/g, '24ч после стационара'],
  [/24 soatlik oilaviy shifokor kuzatuvi/g, '24-часовое наблюдение семейного врача'],
  [/Rejali shifokor ko‘rigi/g, 'Плановый осмотр врача'],
  [/Shoshilinch murojaat tekshiruvi/g, 'Проверка срочного обращения'],
  [/Muddati o‘tgan/g, 'Просрочено'],
  [/Vaqtida bajarildi/g, 'Выполнено вовремя'],
  [/soat/g, 'ч.'],
  [/daqiqa qoldi/g, 'мин. осталось'],
  [/yosh/g, 'лет'],
  [/Erkak/g, 'Муж.'],
  [/Ayol/g, 'Жен.'],
  [/Og‘riq:/g, 'Боль:'],
  [/Muddat:/g, 'Срок:'],
  [/Mas’ul shifokor:/g, 'Лечащий врач:'],
  [/Oilaviy shifokor:/g, 'Семейный врач:'],
  [/Keyingi vazifa:/g, 'Следующая задача:'],
  [/Dori tasdig‘i:/g, 'Приём лекарств:'],
  [/Bo‘lim:/g, 'Отделение:'],
  [/Tuman:/g, 'Район:'],
  [/tumani/g, 'район'],
  [/Soat /g, 'Время '],
  [/Qabul vaqti:/g, 'Время приёма:'],
  [/Ko‘rsatma:/g, 'Инструкция:'],
  [/Holat:/g, 'Статус:'],
  [/Vaqt:/g, 'Время:'],
  [/Davr:/g, 'Период:'],
  [/Bemor:/g, 'Пациент:'],
  [/Yaxshi/g, 'Хорошее'],
  [/O‘rtacha/g, 'Среднее'],
  [/Bezovtalik bor/g, 'Есть дискомфорт'],
  [/Og‘riq kuchaygan/g, 'Боль усилилась'],
  [/Topshirilgan/g, 'Отправлено'],
  [/Ish vaqti:/g, 'График работы:'],
  [/Biriktirilgan bemorlar:/g, 'Закреплённые пациенты:'],
  [/nafar/g, 'чел.'],
  [/Vaqtincha to‘xtatish/g, 'Приостановить'],
  [/Faollashtirish/g, 'Активировать'],
  [/Faol/g, 'Активен'],
  [/Nofaol/g, 'Неактивен'],
];

// Accurate Uzbek Latin -> Uzbek Cyrillic converter (skipping protected proper nouns)
export function latinToUzbekCyrillic(input: string): string {
  if (!input || !/[a-zA-Z]/.test(input)) return input;

  const placeholders: string[] = [];
  let working = input;
  for (const noun of PROTECTED_PROPER_NOUNS) {
    if (working.includes(noun)) {
      const token = `__111_${placeholders.length}_999__`;
      placeholders.push(noun);
      working = working.split(noun).join(token);
    }
  }

  working = working.replace(/['`ʼ’‘]/g, '‘');

  const digraphs: [RegExp, string][] = [
    [/O‘/g, 'Ў'],
    [/o‘/g, 'ў'],
    [/G‘/g, 'Ғ'],
    [/g‘/g, 'ғ'],
    [/Sh/g, 'Ш'],
    [/SH/g, 'Ш'],
    [/sh/g, 'ш'],
    [/Ch/g, 'Ч'],
    [/CH/g, 'Ч'],
    [/ch/g, 'ч'],
    [/Yo/g, 'Ё'],
    [/YO/g, 'Ё'],
    [/yo/g, 'ё'],
    [/Yu/g, 'Ю'],
    [/YU/g, 'Ю'],
    [/yu/g, 'ю'],
    [/Ya/g, 'Я'],
    [/YA/g, 'Я'],
    [/ya/g, 'я'],
    [/Ye/g, 'Е'],
    [/YE/g, 'Е'],
    [/ye/g, 'е'],
    [/Ts/g, 'Ц'],
    [/ts/g, 'ц'],
  ];

  for (const [regex, rep] of digraphs) {
    working = working.replace(regex, rep);
  }

  working = working.replace(/(^|[\s(["«—-])E/g, '$1Э');
  working = working.replace(/(^|[\s(["«—-])e/g, '$1э');

  const charMap: Record<string, string> = {
    A: 'А',
    a: 'а',
    B: 'Б',
    b: 'б',
    D: 'Д',
    d: 'д',
    E: 'Е',
    e: 'е',
    F: 'Ф',
    f: 'ф',
    G: 'Г',
    g: 'г',
    H: 'Ҳ',
    h: 'ҳ',
    I: 'И',
    i: 'и',
    J: 'Ж',
    j: 'ж',
    K: 'К',
    k: 'к',
    L: 'Л',
    l: 'л',
    M: 'М',
    m: 'м',
    N: 'Н',
    n: 'н',
    O: 'О',
    o: 'о',
    P: 'П',
    p: 'п',
    Q: 'Қ',
    q: 'қ',
    R: 'Р',
    r: 'р',
    S: 'С',
    s: 'с',
    T: 'Т',
    t: 'т',
    U: 'У',
    u: 'у',
    V: 'В',
    v: 'в',
    X: 'Х',
    x: 'х',
    Y: 'Й',
    y: 'й',
    Z: 'З',
    z: 'з',
    '‘': 'ъ',
  };

  let out = '';
  for (let i = 0; i < working.length; i++) {
    const ch = working[i];
    out += charMap[ch] !== undefined ? charMap[ch] : ch;
  }

  placeholders.forEach((noun, idx) => {
    const token = `__111_${idx}_999__`;
    out = out.split(token).join(noun);
  });

  return out;
}

export function translateString(raw: string, lang: AppLanguage): string {
  if (!raw) return raw;
  const normalizedRaw = raw
    .replace(/CareBridge AI/g, 'Carely')
    .replace(/CareBridge/g, 'Carely')
    .replace(
      /Davolanish tugasa ham, nazorat davom etadi\./g,
      'Davolanish tugasa ham, g‘amxo‘rlik davom etadi.'
    );
  if (lang === 'uz') return normalizedRaw;
  const trimmed = normalizedRaw.trim();
  if (!trimmed) return normalizedRaw;

  if (
    PROTECTED_PROPER_NOUNS.includes(trimmed) ||
    trimmed.startsWith('+998') ||
    trimmed.includes('@') ||
    /^ID:\s/i.test(trimmed)
  ) {
    return normalizedRaw;
  }

  const exact = UI_PHRASE_MAP[trimmed];
  if (exact) {
    const translated = lang === 'ru' ? exact.ru : exact.uz_cyrl;
    return normalizedRaw.replace(trimmed, translated);
  }

  // Handle strings with counts like "Barchasi (12)" or "2. Dori rejasi (4)"
  const countMatch = trimmed.match(/^(.*?)(\s*\(\d+\))$/);
  if (countMatch) {
    const baseText = countMatch[1].trim();
    const countSuffix = countMatch[2];
    const baseEntry = UI_PHRASE_MAP[baseText];
    if (baseEntry) {
      return (lang === 'ru' ? baseEntry.ru : baseEntry.uz_cyrl) + countSuffix;
    }
  }

  if (lang === 'uz_cyrl') {
    return latinToUzbekCyrillic(normalizedRaw);
  }

  if (lang === 'ru') {
    let ruOut = normalizedRaw;
    for (const [pattern, rep] of RU_FRAGMENT_REPLACEMENTS) {
      ruOut = ruOut.replace(pattern, rep);
    }
    return ruOut;
  }

  return normalizedRaw;
}

interface I18nContextValue {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  theme: AppThemeMode;
  setTheme: (next: AppThemeMode) => void;
  resolvedDark: boolean;
  tr: (text: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: DEFAULT_LANGUAGE,
  setLang: () => {},
  theme: DEFAULT_THEME,
  setTheme: () => {},
  resolvedDark: false,
  tr: (text) => text,
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      // Remove legacy unversioned key so fresh deployments always start in Uzbek Latin ('uz')
      localStorage.removeItem('carely_lang');
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as AppLanguage | null;
      if (saved === 'uz' || saved === 'ru' || saved === 'uz_cyrl') return saved;
    } catch {
      // ignore
    }
    return DEFAULT_LANGUAGE;
  });

  const [theme, setThemeState] = useState<AppThemeMode>(() => {
    try {
      // Remove legacy unversioned key so fresh deployments always start in Light Mode ('light')
      localStorage.removeItem('carely_theme');
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // ignore
    }
    return DEFAULT_THEME;
  });

  const [resolvedDark, setResolvedDark] = useState<boolean>(false);
  // Track both the original Uzbek text and the last written translated text per DOM Text node
  const originalTextMapRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const lastWrittenMapRef = useRef<WeakMap<Text, string>>(new WeakMap());

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((next: AppThemeMode) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  // Apply Light / Dark / System theme to document.documentElement (Defaults to Light Mode)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      setResolvedDark(isDark);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  // Synchronize DOM text nodes and input placeholders reliably when language switches or React renders
  useEffect(() => {
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz';

    const localizeSubtree = (root: Node) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (
              tag === 'SCRIPT' ||
              tag === 'STYLE' ||
              tag === 'TEXTAREA' ||
              parent.closest('[data-no-translate="true"]')
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const textNodes: Text[] = [];
      let current = walker.nextNode();
      while (current) {
        textNodes.push(current as Text);
        current = walker.nextNode();
      }

      for (const textNode of textNodes) {
        const currentVal = textNode.nodeValue || '';
        if (!currentVal.trim()) continue;

        let baseVal = originalTextMapRef.current.get(textNode);
        const lastWritten = lastWrittenMapRef.current.get(textNode);

        // If we have never seen this node, OR React itself updated the node since our last write
        if (baseVal === undefined || (lastWritten !== undefined && currentVal !== lastWritten)) {
          baseVal = currentVal;
          originalTextMapRef.current.set(textNode, baseVal);
        }

        const nextVal = translateString(baseVal, lang);
        lastWrittenMapRef.current.set(textNode, nextVal);
        if (textNode.nodeValue !== nextVal) {
          textNode.nodeValue = nextVal;
        }
      }

      if (root instanceof HTMLElement || root instanceof Document) {
        const inputs = root.querySelectorAll('input[placeholder], textarea[placeholder]');
        inputs.forEach((el) => {
          const basePh =
            el.getAttribute('data-orig-placeholder') ||
            el.getAttribute('placeholder') ||
            '';
          if (!el.getAttribute('data-orig-placeholder')) {
            el.setAttribute('data-orig-placeholder', basePh);
          }
          const nextPh = translateString(basePh, lang);
          if (el.getAttribute('placeholder') !== nextPh) {
            el.setAttribute('placeholder', nextPh);
          }
        });
      }
    };

    localizeSubtree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => localizeSubtree(n));
        } else if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          const textNode = m.target as Text;
          const lastWritten = lastWrittenMapRef.current.get(textNode);
          if (textNode.nodeValue && textNode.nodeValue !== lastWritten) {
            originalTextMapRef.current.set(textNode, textNode.nodeValue);
            const nextVal = translateString(textNode.nodeValue, lang);
            lastWrittenMapRef.current.set(textNode, nextVal);
            if (textNode.nodeValue !== nextVal) {
              textNode.nodeValue = nextVal;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [lang]);

  const tr = useCallback(
    (text: string) => translateString(text, lang),
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      resolvedDark,
      tr,
    }),
    [lang, setLang, theme, setTheme, resolvedDark, tr]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// ============================================================================
// CARELY MEDICAL-STYLE BRAND LOGO COMPONENT
// ============================================================================
export const CarelyLogo: React.FC<{
  compact?: boolean;
  darkText?: boolean;
  subtitle?: string;
}> = ({ compact = false, darkText = false, subtitle }) => {
  const { tr } = useI18n();
  return (
    <div
      className="flex items-center gap-3 min-w-0 select-none"
      data-no-translate="true"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1769E0] to-[#12B8A6] text-white flex items-center justify-center shadow-xs shrink-0 relative">
        <HeartPulse className="w-5 h-5 stroke-[2.4]" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="font-display font-extrabold text-xl tracking-tight leading-none flex items-center">
            <span className={darkText ? 'text-[#152238] dark:text-white' : 'text-white'}>
              Care
            </span>
            <span className="text-[#12B8A6]">ly</span>
          </div>
          {subtitle && (
            <div
              className={`text-xs truncate mt-1 ${
                darkText ? 'text-[#64748B] dark:text-slate-400' : 'text-slate-300'
              }`}
            >
              {tr(subtitle)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SETTINGS RADIO/BUTTON CONTROLS FOR LANGUAGE ("Til") & THEME ("Ko‘rinish")
// ============================================================================
export const LanguageSwitcher: React.FC<{ compact?: boolean }> = () => {
  const { lang, setLang } = useI18n();
  const options: { id: AppLanguage; label: string }[] = [
    { id: 'uz', label: 'O‘zbekcha' },
    { id: 'ru', label: 'Русский' },
    { id: 'uz_cyrl', label: 'Ўзбекча' },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full"
      data-no-translate="true"
      role="radiogroup"
      aria-label="Til"
    >
      {options.map((opt) => {
        const active = lang === opt.id;
        return (
          <label
            key={opt.id}
            onClick={() => setLang(opt.id)}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-blue-50 border-[#1769E0] text-[#1769E0]'
                : 'bg-white border-slate-200 text-[#152238] hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="carely-language"
              checked={active}
              onChange={() => setLang(opt.id)}
              className="w-4 h-4 accent-[#1769E0]"
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
};

export const ThemeSwitcher: React.FC<{ showLabels?: boolean }> = () => {
  const { theme, setTheme, lang } = useI18n();

  const labels = {
    light: lang === 'ru' ? 'Дневной' : lang === 'uz_cyrl' ? 'Кундузги' : 'Kunduzgi',
    dark: lang === 'ru' ? 'Ночной' : lang === 'uz_cyrl' ? 'Тунги' : 'Tungi',
    system:
      lang === 'ru'
        ? 'Системный'
        : lang === 'uz_cyrl'
        ? 'Тизим бўйича'
        : 'Tizim bo‘yicha',
  };

  const modes: {
    id: AppThemeMode;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'light', label: labels.light, icon: Sun },
    { id: 'dark', label: labels.dark, icon: Moon },
    { id: 'system', label: labels.system, icon: Monitor },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full"
      data-no-translate="true"
      role="radiogroup"
      aria-label="Ko‘rinish"
    >
      {modes.map((m) => {
        const Icon = m.icon;
        const active = theme === m.id;
        return (
          <label
            key={m.id}
            onClick={() => setTheme(m.id)}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-blue-50 border-[#1769E0] text-[#1769E0]'
                : 'bg-white border-slate-200 text-[#152238] hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="carely-theme"
              checked={active}
              onChange={() => setTheme(m.id)}
              className="w-4 h-4 accent-[#1769E0]"
            />
            <Icon className="w-4 h-4 shrink-0" />
            <span>{m.label}</span>
          </label>
        );
      })}
    </div>
  );
};
