export type Language = 'en' | 'ru';

export const translations = {
  en: {
    // Brand & General
    brandName: 'Aperture Live',
    brandTagline: 'Collaborative Event Photo Platform',
    dashboard: 'Dashboard',
    myAlbums: 'My Albums',
    settings: 'Settings',
    documentation: 'Setup & SQL',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    demoMode: 'Demo Mode',
    active: 'Active',
    paused: 'Paused',
    public: 'Public',
    protected: 'Protected',

    // Dashboard metrics
    totalAlbums: 'Total Albums',
    photosCollected: 'Photos Collected',
    contributors: 'Contributors',
    storageUsed: 'Storage Used',

    // Albums list & actions
    createAlbum: 'Create Album',
    newAlbumTitle: 'New Album',
    searchPlaceholder: 'Search albums by title or tag...',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortNameAsc: 'Name (A-Z)',
    sortNameDesc: 'Name (Z-A)',
    sortMostPhotos: 'Most Photos',
    noAlbumsFound: 'No albums found matching your criteria',
    noAlbumsYet: 'No albums created yet',
    noAlbumsDescription: 'Create your first event album to generate a unique QR code for instant guest photo uploads.',

    // Album card actions
    openAlbum: 'Manage',
    shareAlbum: 'Share & QR',
    viewGallery: 'Public Gallery',
    downloadZip: 'Download All (ZIP)',
    editAlbum: 'Edit Details',
    deleteAlbum: 'Delete Album',
    pauseUploads: 'Pause Uploads',
    resumeUploads: 'Resume Uploads',
    photosCount: 'photos',

    // Create Album Modal / Form
    albumTitleLabel: 'Album Title',
    albumTitlePlaceholder: 'e.g. Developer Summit 2026 Keynote',
    albumDescLabel: 'Description / Instructions',
    albumDescPlaceholder: 'e.g. Snap stage moments, backstage candids, and product demos!',
    eventDateLabel: 'Event Date',
    locationLabel: 'Location / Venue',
    locationPlaceholder: 'e.g. Moscone Center, San Francisco',
    privacyLabel: 'Access Privacy',
    privacyPublicDesc: 'Anyone with the unique QR code or link can view & upload',
    privacyCodeDesc: 'Requires an optional passcode to view',
    accessCodeLabel: 'Passcode (Optional)',
    accessCodePlaceholder: 'e.g. 4821',
    coverImageLabel: 'Cover Photograph',
    saveAlbum: 'Create Album',
    updateAlbum: 'Save Changes',
    cancel: 'Cancel',

    // Share & QR Modal
    shareTitle: 'Album Access & QR Code',
    shareSubtitle: 'Guests scan the QR code to open the upload page on their mobile browser without installing an app or signing in.',
    qrCodeTitle: 'Event QR Code',
    qrCodeSubtitle: 'Scan to upload photos directly from mobile',
    guestUploadLink: 'Guest Upload Link',
    publicGalleryLink: 'Public Gallery Link',
    copyLink: 'Copy Link',
    copied: 'Copied to Clipboard!',
    downloadQrPng: 'Download High-Res QR (PNG)',
    printStandee: 'Print Event Signage / Standee',
    previewGuestView: 'Live Mobile Preview',
    nativeShare: 'Share with Device',

    // Guest Upload Page
    guestWelcome: 'Upload Event Photos',
    guestUploadNotice: 'Drop your best shots from the event. No login or app installation required.',
    contributorNameLabel: 'Your Name (Optional)',
    contributorNamePlaceholder: 'e.g. Sarah K. or Anonymous',
    dropPhotosHere: 'Drag & drop photos here, or click to browse',
    mobilePickerBtn: 'Take Photo or Choose Files',
    uploadLimitNotice: 'Supports JPG, PNG, WEBP up to 20MB per photo.',
    uploadSelectedPhotos: 'Upload Photos',
    uploadingBatch: 'Uploading Photos...',
    uploadSuccessTitle: 'Photos Uploaded Successfully!',
    uploadSuccessMessage: 'Your photos are now live in the event gallery.',
    uploadMore: 'Upload More Photos',
    viewEventGalleryBtn: 'View Live Gallery',
    uploadsPausedTitle: 'Uploads are Currently Paused',
    uploadsPausedMessage: 'The event organizer has paused photo submissions for this album.',

    // Public Gallery
    galleryTitle: 'Live Event Gallery',
    gallerySubtitle: 'Photos uploaded in real-time by event guests and attendees.',
    liveRefresh: 'Refresh Feed',
    emptyGalleryTitle: 'No photos uploaded yet',
    emptyGalleryMessage: 'Be the first to share a moment from this event!',
    uploadPhotosAction: 'Upload Photos',
    downloadPhoto: 'Download Photo',
    photoBy: 'Photo by',
    justNow: 'just now',
    ago: 'ago',

    // Settings
    settingsTitle: 'Account & Workspace Preferences',
    storageQuota: 'Storage Quota & Utilization',
    defaultPrivacyPref: 'Default Album Privacy',
    fileSizeLimit: 'Maximum Upload Size Limit',
    allowedFormats: 'Supported File Formats',
    databaseIntegration: 'Database & Supabase Integration',
    supabaseInstructions: 'For shared albums and photo uploads on Vercel, run this SQL in the Supabase SQL Editor. Then add SUPABASE_URL and the server-only SUPABASE_SECRET_KEY in Vercel Project Settings → Environment Variables. Never expose the secret key in browser code.',
  },
  ru: {
    // Brand & General
    brandName: 'Aperture Live',
    brandTagline: 'Платформа совместного фотоальбома событий',
    dashboard: 'Панель управления',
    myAlbums: 'Мои альбомы',
    settings: 'Настройки',
    documentation: 'База данных и SQL',
    signOut: 'Выйти',
    signIn: 'Войти',
    signUp: 'Регистрация',
    demoMode: 'Демо-режим',
    active: 'Активен',
    paused: 'Приостановлен',
    public: 'Публичный',
    protected: 'Защищен кодом',

    // Dashboard metrics
    totalAlbums: 'Всего альбомов',
    photosCollected: 'Собрано фото',
    contributors: 'Участников',
    storageUsed: 'Память',

    // Albums list & actions
    createAlbum: 'Создать альбом',
    newAlbumTitle: 'Новый альбом',
    searchPlaceholder: 'Поиск альбомов по названию...',
    sortNewest: 'Сначала новые',
    sortOldest: 'Сначала старые',
    sortNameAsc: 'Название (А-Я)',
    sortNameDesc: 'Название (Я-А)',
    sortMostPhotos: 'Больше всего фото',
    noAlbumsFound: 'Альбомы не найдены',
    noAlbumsYet: 'Нет созданных альбомов',
    noAlbumsDescription: 'Создайте свой первый альбом, чтобы получить QR-код для мгновенной загрузки фото гостями.',

    // Album card actions
    openAlbum: 'Управление',
    shareAlbum: 'Поделиться и QR',
    viewGallery: 'Публичная галерея',
    downloadZip: 'Скачать архив (ZIP)',
    editAlbum: 'Редактировать',
    deleteAlbum: 'Удалить альбом',
    pauseUploads: 'Приостановить загрузку',
    resumeUploads: 'Возобновить загрузку',
    photosCount: 'фото',

    // Create Album Modal / Form
    albumTitleLabel: 'Название альбома',
    albumTitlePlaceholder: 'Например: Tech Summit 2026',
    albumDescLabel: 'Описание / Инструкции',
    albumDescPlaceholder: 'Например: Делитесь яркими моментами со сцены и нетворкинга!',
    eventDateLabel: 'Дата события',
    locationLabel: 'Локация / Место',
    locationPlaceholder: 'Например: Экспоцентр, Москва',
    privacyLabel: 'Конфиденциальность',
    privacyPublicDesc: 'Любой с QR-кодом или ссылкой может загружать и просматривать',
    privacyCodeDesc: 'Требуется пин-код для просмотра',
    accessCodeLabel: 'Пин-код (необязательно)',
    accessCodePlaceholder: 'Например: 4821',
    coverImageLabel: 'Обложка альбома',
    saveAlbum: 'Создать альбом',
    updateAlbum: 'Сохранить изменения',
    cancel: 'Отмена',

    // Share & QR Modal
    shareTitle: 'Доступ к альбому и QR-код',
    shareSubtitle: 'Гости сканируют QR-код камерой смартфона и загружают фото без регистрации и установки приложений.',
    qrCodeTitle: 'QR-код события',
    qrCodeSubtitle: 'Сканируйте для моментальной загрузки фото',
    guestUploadLink: 'Ссылка для гостей (загрузка)',
    publicGalleryLink: 'Ссылка на публичную галерею',
    copyLink: 'Копировать ссылку',
    copied: 'Скопировано в буфер!',
    downloadQrPng: 'Скачать QR (PNG)',
    printStandee: 'Распечатать табличку на стол',
    previewGuestView: 'Предпросмотр экрана гостя',
    nativeShare: 'Поделиться через устройство',

    // Guest Upload Page
    guestWelcome: 'Загрузка фото события',
    guestUploadNotice: 'Загрузите фотографии с мероприятия. Регистрация не требуется.',
    contributorNameLabel: 'Ваше имя (необязательно)',
    contributorNamePlaceholder: 'Например: Анна Смирнова или Аноним',
    dropPhotosHere: 'Перетащите фото сюда или нажмите для выбора',
    mobilePickerBtn: 'Сделать снимок или выбрать из галереи',
    uploadLimitNotice: 'Поддерживаются JPG, PNG, WEBP до 20 МБ на фото.',
    uploadSelectedPhotos: 'Загрузить фотографии',
    uploadingBatch: 'Загрузка фотографий...',
    uploadSuccessTitle: 'Фотографии успешно добавлены!',
    uploadSuccessMessage: 'Ваши снимки уже появились в общей галерее события.',
    uploadMore: 'Загрузить еще фото',
    viewEventGalleryBtn: 'Открыть галерею события',
    uploadsPausedTitle: 'Прием фотографий приостановлен',
    uploadsPausedMessage: 'Организатор временно приостановил добавление новых фото.',

    // Public Gallery
    galleryTitle: 'Живая галерея события',
    gallerySubtitle: 'Фотографии, добавляемые гостями и участниками в реальном времени.',
    liveRefresh: 'Обновить ленту',
    emptyGalleryTitle: 'Пока нет загруженных фото',
    emptyGalleryMessage: 'Будьте первым, кто поделится снимком с этого мероприятия!',
    uploadPhotosAction: 'Загрузить фото',
    downloadPhoto: 'Скачать фото',
    photoBy: 'Фото от',
    justNow: 'только что',
    ago: 'назад',

    // Settings
    settingsTitle: 'Настройки учетной записи',
    storageQuota: 'Квота хранилища',
    defaultPrivacyPref: 'Конфиденциальность по умолчанию',
    fileSizeLimit: 'Максимальный размер файла',
    allowedFormats: 'Разрешенные форматы',
    databaseIntegration: 'Интеграция с базой данных Supabase',
    supabaseInstructions: 'Чтобы альбомы и фото синхронизировались между телефоном и сайтом на Vercel, выполните эту SQL-схему в Supabase SQL Editor. Затем добавьте SUPABASE_URL и серверный SUPABASE_SECRET_KEY в Vercel → Project Settings → Environment Variables. Не добавляйте секретный ключ во фронтенд и не используйте префикс VITE_.',
  }
};

let currentLang: Language = 'ru';
try {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('aperture_lang');
    if (saved === 'en' || saved === 'ru') currentLang = saved;
  }
} catch {
  // Ignore localStorage restrictions
}

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language): void {
  currentLang = lang;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aperture_lang', lang);
    }
  } catch {
    // Ignore localStorage restrictions
  }
}

export function useI18n() {
  const t = translations[currentLang] || translations.en;
  return { t, lang: currentLang, setLanguage };
}
