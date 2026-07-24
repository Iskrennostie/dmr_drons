(() => {
  const money = new Intl.NumberFormat("ru-RU");
  const pageFor = (id) => ({
    heavy: "heavy.html",
    ultra: "ultra-light.html",
    fast: "super-fast.html"
  }[id] || `model.html?model=${id}`);

  const commonExtras = {
    care: { id: "care", name: "MDR Care 24", note: "Приоритетная диагностика и поддержка в течение года", add: 690 },
    academy: { id: "academy", name: "MDR Academy", note: "Персональный вводный курс для двух операторов", add: 490 },
    battery: { id: "battery", name: "Energy Reserve", note: "Два дополнительных аккумулятора и зарядная станция", add: 890 },
    rtk: { id: "rtk", name: "RTK Precision", note: "Сантиметровое позиционирование и наземная метка", add: 1190 },
    thermal: { id: "thermal", name: "Thermal Vision", note: "Тепловизионный модуль с записью телеметрии", add: 1690 },
    shield: { id: "shield", name: "Weather Shield", note: "Защита электроники для сложной погоды", add: 790 }
  };

  const product = (data) => ({
    category: "professional",
    page: pageFor(data.id),
    priceLabel: `от ${money.format(data.price)} у.е.`,
    extras: [commonExtras.care, commonExtras.academy, commonExtras.battery],
    ...data
  });

  const products = {
    heavy: product({
      id: "heavy",
      name: "MDR Heavy",
      short: "HEAVY",
      displayLead: "MDR",
      displayAccent: "HEAVY",
      category: "industrial",
      eyebrow: "Тяжёлая промышленная платформа",
      tagline: "Сила, которая берёт больше.",
      description: "MDR Heavy создан для задач, где полезная нагрузка важнее компактности: картография, инспекции протяжённых объектов, тяжёлые камеры и специальные модули.",
      image: "assets/turntable/heavy-front-v1.png",
      configImage: "assets/turntable/heavy-front-v1.png",
      views: ["assets/turntable/heavy-front-v1.png", "assets/turntable/heavy-right-v1.png", "assets/turntable/heavy-rear-v1.png", "assets/turntable/heavy-left-v1.png"],
      imageAlt: "Тяжёлый промышленный дрон MDR Heavy",
      accent: "#ff8d4b",
      heroAccent: "#ff8d4b",
      price: 12990,
      stats: [["7,5 кг", "полезная нагрузка"], ["38 мин", "время в воздухе"], ["15 км", "защищённая видеосвязь"]],
      colors: [
        { id: "graphite", name: "Индустриальный графит", hex: "#293039", ui: "#8d9aa6", finish: "Металлик", add: 0, filter: "none" },
        { id: "orange", name: "Сигнальный оранжевый", hex: "#ef7f3b", ui: "#ff8d4b", finish: "Специальное покрытие", add: 420, filter: "sepia(.52) saturate(1.75) hue-rotate(334deg) brightness(1.08)" },
        { id: "sand", name: "Пустынный металлик", hex: "#9d8b72", ui: "#c1a780", finish: "Металлик", add: 550, filter: "sepia(.42) saturate(.86) hue-rotate(350deg) brightness(1.14)" }
      ],
      packages: [
        { id: "core", name: "Heavy Core", note: "Дрон, 2 аккумулятора, защищённый кейс", add: 0 },
        { id: "survey", name: "Survey Pro", note: "RTK-модуль, наземная станция и 3 аккумулятора", add: 2490 },
        { id: "cinema", name: "Cinema Lift", note: "Подвес для тяжёлой камеры и операторский монитор", add: 3190 }
      ],
      extras: [commonExtras.rtk, commonExtras.care, commonExtras.shield],
      story: "Выверенная геометрия рамы распределяет тягу по восьми роторам. Широкие опоры стабилизируют систему с крупной камерой или измерительным модулем, а контрастные метки остаются заметны на площадке даже в сложном свете.",
      features: [["Резерв тяги", "Восемь моторов и продуманное распределение массы дают уверенный запас для полезной нагрузки."], ["Модульная платформа", "Подвес, камера, лидар или измерительный модуль меняются под конкретную смену."], ["Контроль миссии", "Дублирование критических узлов и телеметрия показывают состояние системы на каждом этапе."]],
      specs: [["Взлётная масса", "до 15,2 кг"], ["Полезная нагрузка", "до 7,5 кг"], ["Время полёта", "до 38 минут"], ["Дальность связи", "до 15 км"], ["Рабочая температура", "−10 °C … +45 °C"], ["Навигация", "GNSS + RTK"]]
    }),
    ultra: product({
      id: "ultra",
      name: "MDR Ultra Light",
      short: "ULTRA LIGHT",
      displayLead: "MDR ULTRA",
      displayAccent: "LIGHT",
      category: "creative",
      eyebrow: "Лёгкая профессиональная серия",
      tagline: "Быстрее, легче, эффективнее.",
      description: "MDR Ultra Light — мобильный инструмент для съёмок, быстрых инспекций и ежедневных выездов. Он собирается за минуты, занимает минимум места и даёт стабильную картинку там, где важен темп.",
      image: "assets/turntable/ultra-front-v1.png",
      configImage: "assets/turntable/ultra-front-v1.png",
      views: ["assets/turntable/ultra-front-v1.png", "assets/turntable/ultra-right-v1.png", "assets/turntable/ultra-rear-v1.png", "assets/turntable/ultra-left-v1.png"],
      imageAlt: "Профессиональный квадрокоптер MDR Ultra Light",
      accent: "#92a7ff",
      heroAccent: "#92a7ff",
      price: 8990,
      stats: [["3,2 кг", "масса системы"], ["42 мин", "время в воздухе"], ["12 км", "радиус видеосвязи"]],
      colors: [
        { id: "silver", name: "Холодный серебристый", hex: "#b8c3ca", ui: "#aebdff", finish: "Металлик", add: 0, filter: "none" },
        { id: "graphite", name: "Глубокий графит", hex: "#293038", ui: "#7f8f9e", finish: "Металлик", add: 290, filter: "grayscale(1) brightness(.66) contrast(1.28)" },
        { id: "ice", name: "Ледяной синий", hex: "#76a6cc", ui: "#82bff0", finish: "Перламутр", add: 390, filter: "sepia(.2) saturate(1.45) hue-rotate(160deg) brightness(1.05)" }
      ],
      packages: [
        { id: "core", name: "Ultra Core", note: "Дрон, 2 аккумулятора, компактный кейс", add: 0 },
        { id: "creator", name: "Creator Kit", note: "4K-камера, ND-фильтры и монитор 7 дюймов", add: 1290 },
        { id: "inspection", name: "Inspection Kit", note: "Тепловизионный модуль и 3 аккумулятора", add: 2290 }
      ],
      extras: [commonExtras.battery, commonExtras.academy, commonExtras.thermal],
      story: "Лёгкий каркас и низкий центр тяжести делают Ultra Light точным в управлении. Рама рассчитана на частую транспортировку, а камера на трёхосевом подвесе удерживает кадр спокойным даже при активной траектории.",
      features: [["Готов за минуты", "Компактная компоновка экономит время на площадке: меньше сборки — больше полезного полёта."], ["Кадр без компромиссов", "Стабилизированная 4K-камера и низкая задержка дают оператору ясный контроль."], ["Лёгкая логистика", "Кейс помещается в обычный автомобильный багажник и не требует отдельной команды."]],
      specs: [["Взлётная масса", "3,2 кг"], ["Время полёта", "до 42 минут"], ["Дальность связи", "до 12 км"], ["Камера", "4K, 3-осевой подвес"], ["Рабочая температура", "−5 °C … +40 °C"], ["Навигация", "GNSS + Visual Positioning"]]
    }),
    fast: product({
      id: "fast",
      name: "MDR Super Fast",
      short: "SUPER FAST",
      displayLead: "MDR SUPER",
      displayAccent: "FAST",
      category: "speed",
      eyebrow: "Динамичная инспекционная серия",
      tagline: "Создан, чтобы опережать.",
      description: "MDR Super Fast выбирают, когда маршрут меняется быстро, а решение нужно принять уже в воздухе. Аэродинамичный корпус, резвая реакция и яркая визуальная подпись делают его инструментом для скоростных миссий.",
      image: "assets/turntable/fast-front-v1.png",
      configImage: "assets/turntable/fast-front-v1.png",
      views: ["assets/turntable/fast-front-v1.png", "assets/turntable/fast-right-v1.png", "assets/turntable/fast-rear-v1.png", "assets/turntable/fast-left-v1.png"],
      imageAlt: "Скоростной дрон MDR Super Fast",
      accent: "#16d7f2",
      heroAccent: "#16d7f2",
      price: 10490,
      stats: [["145 км/ч", "максимальная скорость"], ["28 мин", "динамический полёт"], ["10 км", "низколатентная связь"]],
      colors: [
        { id: "midnight", name: "Ночной графит", hex: "#141b22", ui: "#5e7180", finish: "Металлик", add: 0, filter: "none" },
        { id: "electric", name: "Электрик", hex: "#05cce8", ui: "#16d7f2", finish: "Специальное покрытие", add: 450, filter: "saturate(1.35) brightness(1.07)" },
        { id: "polar", name: "Полярный белый", hex: "#dce4e7", ui: "#e7f5f7", finish: "Перламутр", add: 350, filter: "grayscale(1) brightness(1.48) contrast(.86)" }
      ],
      packages: [
        { id: "core", name: "Fast Core", note: "Дрон, 3 аккумулятора, транспортный кейс", add: 0 },
        { id: "pursuit", name: "Pursuit Pack", note: "FPV-монитор, скоростной пульт и 5 аккумуляторов", add: 1790 },
        { id: "night", name: "Night Watch", note: "Тепловизионный модуль и защищённый дисплей", add: 2690 }
      ],
      extras: [commonExtras.battery, commonExtras.care, commonExtras.thermal],
      story: "Вытянутый корпус и короткие аэродинамичные лучи помогают Super Fast сохранять уверенность на резких манёврах. Голубая световая линия облегчает визуальную ориентацию команды на площадке.",
      features: [["Рождён для темпа", "Лёгкая жёсткая рама и быстрая силовая установка делают траекторию отзывчивой."], ["Живое изображение", "Низколатентная передача позволяет принимать решение по текущему кадру."], ["Заметен ночью", "Контурная подсветка и программируемые сигналы помогают работать после заката."]],
      specs: [["Максимальная скорость", "до 145 км/ч"], ["Время полёта", "до 28 минут"], ["Дальность связи", "до 10 км"], ["Камера", "4K / 120 fps"], ["Рабочая температура", "−5 °C … +40 °C"], ["Навигация", "GNSS + Visual Positioning"]]
    }),
    night: product({
      id: "night",
      name: "MDR Night Falcon",
      short: "NIGHT FALCON",
      displayLead: "MDR NIGHT",
      displayAccent: "FALCON",
      category: "security",
      eyebrow: "Тихая система ночного наблюдения",
      tagline: "Видит то, что скрывает ночь.",
      description: "Закрытые винтовые каналы, малошумный режим и двойная оптика делают Night Falcon точным инструментом охраны периметра и ночной разведки.",
      image: "assets/turntable/night-front-v1.png",
      configImage: "assets/turntable/night-front-v1.png",
      views: ["assets/turntable/night-front-v1.png", "assets/turntable/night-right-v1.png", "assets/turntable/night-rear-v1.png", "assets/turntable/night-left-v1.png"],
      imageAlt: "Фиолетовый дрон наблюдения MDR Night Falcon",
      accent: "#a674ff",
      heroAccent: "#a674ff",
      price: 11890,
      stats: [["29 дБ", "режим Silent Watch"], ["48 мин", "патрульный полёт"], ["4K + IR", "двойная оптика"]],
      colors: [
        { id: "violet", name: "Ночной фиолетовый", hex: "#673b99", ui: "#a674ff", finish: "Металлик", add: 0, filter: "none" },
        { id: "indigo", name: "Индиго спектр", hex: "#273b8f", ui: "#718cff", finish: "Перламутр", add: 480, filter: "hue-rotate(42deg) saturate(1.15)" },
        { id: "shadow", name: "Теневая сталь", hex: "#262832", ui: "#8d91a5", finish: "Матовый", add: 390, filter: "grayscale(.82) brightness(.72) contrast(1.18)" }
      ],
      packages: [
        { id: "watch", name: "Silent Watch", note: "Дрон, IR-камера, 3 аккумулятора", add: 0 },
        { id: "perimeter", name: "Perimeter Pro", note: "Тепловизор, автопатруль и защищённая станция", add: 2190 },
        { id: "command", name: "Night Command", note: "Две камеры, прожектор и операторский терминал", add: 3290 }
      ],
      extras: [commonExtras.thermal, commonExtras.care, commonExtras.shield],
      story: "Кольцевые каналы защищают винты и снижают заметность звука. Фиолетовые контуры можно полностью отключить, а поворотная оптика сохраняет объект в кадре без резких движений корпуса.",
      features: [["Silent Watch", "Алгоритм ограничивает обороты и сглаживает траекторию для тихого патруля."], ["Двойной взгляд", "Основная камера и тепловизор работают в единой временной шкале."], ["Безопасный маршрут", "Датчики кругового обзора видят провода, ветви и элементы фасада."]],
      specs: [["Масса", "4,1 кг"], ["Время полёта", "до 48 минут"], ["Уровень шума", "от 29 дБ"], ["Оптика", "4K + 640×512 IR"], ["Дальность связи", "до 14 км"], ["Защита", "IP45"]]
    }),
    arctic: product({
      id: "arctic",
      name: "MDR Arctic Scout",
      short: "ARCTIC SCOUT",
      displayLead: "MDR ARCTIC",
      displayAccent: "SCOUT",
      category: "mapping",
      eyebrow: "Всепогодный картографический комплекс",
      tagline: "Точность ниже нуля.",
      description: "Arctic Scout сохраняет устойчивость навигации и ресурсы аккумуляторов в холоде. Шесть роторов, обогрев сенсоров и RTK-контур рассчитаны на снег, ледники и высотные площадки.",
      image: "assets/turntable/arctic-front-v1.png",
      configImage: "assets/turntable/arctic-front-v1.png",
      views: ["assets/turntable/arctic-front-v1.png", "assets/turntable/arctic-right-v1.png", "assets/turntable/arctic-rear-v1.png", "assets/turntable/arctic-left-v1.png"],
      imageAlt: "Белый всепогодный дрон MDR Arctic Scout",
      accent: "#d9edf4",
      heroAccent: "#d9edf4",
      price: 9690,
      stats: [["−30 °C", "холодный запуск"], ["51 мин", "время полёта"], ["2 см", "точность RTK"]],
      colors: [
        { id: "milk", name: "Арктический молочный", hex: "#e9ece7", ui: "#d9edf4", finish: "Перламутр", add: 0, filter: "none" },
        { id: "iceblue", name: "Ледниковый голубой", hex: "#9fc7d7", ui: "#a9ddf0", finish: "Металлик", add: 430, filter: "sepia(.16) saturate(1.28) hue-rotate(146deg) brightness(.98)" },
        { id: "titanium", name: "Полярный титан", hex: "#8f9ba2", ui: "#aebbc2", finish: "Металлик", add: 510, filter: "grayscale(.75) brightness(.79) contrast(1.08)" }
      ],
      packages: [
        { id: "scout", name: "Scout Core", note: "Дрон, RTK, 3 зимних аккумулятора", add: 0 },
        { id: "ice", name: "Ice Survey", note: "Тепловой кейс и геодезическая станция", add: 1890 },
        { id: "summit", name: "Summit Mapping", note: "Высотомер, лидар и 5 аккумуляторов", add: 2990 }
      ],
      extras: [commonExtras.rtk, commonExtras.shield, commonExtras.battery],
      story: "Светлый перламутровый корпус меньше нагревается на ярком снегу, а система обогрева поддерживает сенсоры и аккумуляторы в рабочем диапазоне. Шесть роторов дают спокойную посадку на неровной площадке.",
      features: [["Cold Start", "Предварительный прогрев батарей позволяет готовиться к полёту прямо в кейсе."], ["RTK-контур", "Сантиметровая траектория упрощает повторные облёты и сравнение поверхности."], ["Снежная навигация", "Сенсоры адаптированы к бликам и слабоконтрастному рельефу."]],
      specs: [["Масса", "3,8 кг"], ["Время полёта", "до 51 минуты"], ["Рабочая температура", "−30 °C … +35 °C"], ["Точность RTK", "до 2 см"], ["Дальность связи", "до 13 км"], ["Защита", "IP54"]]
    }),
    rescue: product({
      id: "rescue",
      name: "MDR Rescue One",
      short: "RESCUE ONE",
      displayLead: "MDR RESCUE",
      displayAccent: "ONE",
      category: "rescue",
      eyebrow: "Аварийно-спасательная платформа",
      tagline: "Помощь приходит с воздуха.",
      description: "Rescue One доставляет аптечку, связь или спасательный комплект туда, где наземная команда теряет время. Красный корпус, мощный свет и громкая связь делают его заметным в сложной обстановке.",
      image: "assets/turntable/rescue-front-v1.png",
      configImage: "assets/turntable/rescue-front-v1.png",
      views: ["assets/turntable/rescue-front-v1.png", "assets/turntable/rescue-right-v1.png", "assets/turntable/rescue-rear-v1.png", "assets/turntable/rescue-left-v1.png"],
      imageAlt: "Красный спасательный дрон MDR Rescue One",
      accent: "#ff4e45",
      heroAccent: "#ff4e45",
      price: 13490,
      stats: [["5 кг", "полезная нагрузка"], ["8 км", "аварийная доставка"], ["120 дБ", "голосовой модуль"]],
      colors: [
        { id: "signal", name: "Сигнальный красный", hex: "#e63f35", ui: "#ff4e45", finish: "Высокая видимость", add: 0, filter: "none" },
        { id: "bright", name: "Ярко-красный", hex: "#ff1919", ui: "#ff3030", finish: "Специальное покрытие", add: 390, filter: "saturate(1.55) brightness(1.08)" },
        { id: "rescuewhite", name: "Спасательный белый", hex: "#e6e8e5", ui: "#f4f5f1", finish: "Перламутр", add: 520, filter: "grayscale(.83) brightness(1.32) contrast(.9)" }
      ],
      packages: [
        { id: "first", name: "First Response", note: "Дрон, аптечный контейнер, прожектор", add: 0 },
        { id: "search", name: "Search Team", note: "Тепловизор, громкая связь и 4 батареи", add: 2390 },
        { id: "lifeline", name: "Life Line", note: "Сбрасываемый трос, связь и плавучий модуль", add: 3490 }
      ],
      extras: [commonExtras.thermal, commonExtras.shield, commonExtras.academy],
      story: "Восемь роторов удерживают платформу при работе с контейнером, а высокие опоры оставляют безопасный зазор для груза. Световые полосы видны сверху и с земли, не перекрывая работу тепловизора.",
      features: [["Точная доставка", "Контейнер раскрывается только после подтверждения оператора и фиксации точки."], ["Голосовая связь", "Оператор может передать инструкции до прибытия наземной команды."], ["Аварийный свет", "Прожектор и сигнальные режимы помогают обозначить безопасный маршрут."]],
      specs: [["Масса", "8,9 кг"], ["Полезная нагрузка", "до 5 кг"], ["Время полёта", "до 34 минут"], ["Дальность доставки", "до 8 км"], ["Громкая связь", "до 120 дБ"], ["Защита", "IP55"]]
    }),
    aqua: product({
      id: "aqua",
      name: "MDR Aqua Ray",
      short: "AQUA RAY",
      displayLead: "MDR AQUA",
      displayAccent: "RAY",
      category: "marine",
      eyebrow: "Морская инспекционная серия",
      tagline: "Над водой. Вне сомнений.",
      description: "Aqua Ray создан для побережья, судов и водной инфраструктуры. Обтекаемый корпус, защищённая электроника и поляризационная оптика уверенно работают над бликами и солёным аэрозолем.",
      image: "assets/turntable/aqua-front-v1.png",
      configImage: "assets/turntable/aqua-front-v1.png",
      views: ["assets/turntable/aqua-front-v1.png", "assets/turntable/aqua-right-v1.png", "assets/turntable/aqua-rear-v1.png", "assets/turntable/aqua-left-v1.png"],
      imageAlt: "Голубой морской дрон MDR Aqua Ray",
      accent: "#49c9f2",
      heroAccent: "#49c9f2",
      price: 12190,
      stats: [["IP56", "защита корпуса"], ["46 мин", "патрульный полёт"], ["18 м/с", "устойчивость к ветру"]],
      colors: [
        { id: "sky", name: "Лагунный голубой", hex: "#55bfe8", ui: "#49c9f2", finish: "Металлик", add: 0, filter: "none" },
        { id: "deep", name: "Глубокий океан", hex: "#175b84", ui: "#3d9ed5", finish: "Перламутр", add: 490, filter: "hue-rotate(12deg) saturate(1.28) brightness(.77)" },
        { id: "foam", name: "Морская пена", hex: "#d9ede9", ui: "#c7f5ee", finish: "Перламутр", add: 540, filter: "grayscale(.45) brightness(1.33) contrast(.86)" }
      ],
      packages: [
        { id: "coast", name: "Coast Core", note: "Дрон, поляризационная камера, 3 батареи", add: 0 },
        { id: "harbor", name: "Harbor Scan", note: "Зум-камера, RTK и защитный кейс", add: 1990 },
        { id: "offshore", name: "Offshore Pro", note: "Радарный маяк, тепловизор и 5 батарей", add: 3190 }
      ],
      extras: [commonExtras.shield, commonExtras.rtk, commonExtras.thermal],
      story: "Манта-образный корпус направляет воздушный поток в сторону от оптики. Гидрофобное покрытие защищает линзы от аэрозоля, а яркая голубая поверхность помогает быстро найти аппарат над водой.",
      features: [["Морская защита", "Разъёмы и платы защищены от солёного аэрозоля и кратковременных осадков."], ["Чистая поверхность", "Поляризационная камера уменьшает блики и лучше читает границу воды."], ["Возврат по ветру", "Система заранее рассчитывает необходимый резерв энергии для возвращения к берегу."]],
      specs: [["Масса", "4,7 кг"], ["Время полёта", "до 46 минут"], ["Ветровая устойчивость", "до 18 м/с"], ["Камера", "4K Polarized Zoom"], ["Дальность связи", "до 16 км"], ["Защита", "IP56"]]
    }),
    terra: product({
      id: "terra",
      name: "MDR Terra Green",
      short: "TERRA GREEN",
      displayLead: "MDR TERRA",
      displayAccent: "GREEN",
      category: "agri",
      eyebrow: "Мультиспектральная агроплатформа",
      tagline: "Видит состояние каждого поля.",
      description: "Terra Green объединяет мультиспектральную камеру, точную карту и длительный полёт. Он помогает обнаруживать дефицит влаги и проблемные участки до того, как они становятся заметны с земли.",
      image: "assets/turntable/terra-front-v1.png",
      configImage: "assets/turntable/terra-front-v1.png",
      views: ["assets/turntable/terra-front-v1.png", "assets/turntable/terra-right-v1.png", "assets/turntable/terra-rear-v1.png", "assets/turntable/terra-left-v1.png"],
      imageAlt: "Зелёный агродрон MDR Terra Green",
      accent: "#63d77d",
      heroAccent: "#63d77d",
      price: 10990,
      stats: [["320 га", "за одну смену"], ["54 мин", "маршрутный полёт"], ["5 каналов", "спектральная камера"]],
      colors: [
        { id: "forest", name: "Лесной металлик", hex: "#27643d", ui: "#63d77d", finish: "Металлик", add: 0, filter: "none" },
        { id: "sage", name: "Шалфейный металлик", hex: "#7d9879", ui: "#a8c7a2", finish: "Металлик", add: 460, filter: "saturate(.58) brightness(1.15)" },
        { id: "earth", name: "Земляной графит", hex: "#464b3c", ui: "#8e9678", finish: "Матовый", add: 380, filter: "grayscale(.45) sepia(.18) brightness(.72)" }
      ],
      packages: [
        { id: "field", name: "Field Core", note: "Дрон, RGB-камера, 3 аккумулятора", add: 0 },
        { id: "crop", name: "Crop Vision", note: "5-канальная камера и аналитический модуль", add: 1890 },
        { id: "farm", name: "Farm Network", note: "RTK-станция, облачный отчёт и 5 батарей", add: 2890 }
      ],
      extras: [commonExtras.rtk, commonExtras.battery, commonExtras.academy],
      story: "Шесть роторов дают эффективный крейсерский режим, а зелёный металлик не создаёт лишнего контраста над полем. Камеры RGB и multispectral фиксируют данные в одном маршруте.",
      features: [["Пять спектров", "NDVI и дополнительные индексы помогают видеть стресс растений раньше."], ["Маршрут без пробелов", "RTK и контроль перекрытия поддерживают одинаковую плотность данных."], ["Отчёт после посадки", "Система группирует проблемные зоны и готовит карту для агронома."]],
      specs: [["Масса", "4,4 кг"], ["Время полёта", "до 54 минут"], ["Площадь за смену", "до 320 га"], ["Камера", "RGB + 5-band"], ["Точность RTK", "до 2,5 см"], ["Дальность связи", "до 15 км"]]
    }),
    steel: product({
      id: "steel",
      name: "MDR Steel Surveyor",
      short: "STEEL SURVEYOR",
      displayLead: "MDR STEEL",
      displayAccent: "SURVEYOR",
      category: "mapping",
      eyebrow: "Лидарная геодезическая система",
      tagline: "Миллионы точек. Одна точная модель.",
      description: "Steel Surveyor несёт профессиональный лидар и строит плотное облако точек для карьеров, строительства и цифровых двойников. Жёсткая рама сохраняет геометрию сенсора в длительной миссии.",
      image: "assets/turntable/steel-front-v1.png",
      configImage: "assets/turntable/steel-front-v1.png",
      views: ["assets/turntable/steel-front-v1.png", "assets/turntable/steel-right-v1.png", "assets/turntable/steel-rear-v1.png", "assets/turntable/steel-left-v1.png"],
      imageAlt: "Серый лидарный дрон MDR Steel Surveyor",
      accent: "#aab7c1",
      heroAccent: "#aab7c1",
      price: 14690,
      stats: [["2,4 млн", "точек в секунду"], ["3 см", "точность модели"], ["44 мин", "время полёта"]],
      colors: [
        { id: "metal", name: "Инженерный металлик", hex: "#747f87", ui: "#aab7c1", finish: "Металлик", add: 0, filter: "none" },
        { id: "carbon", name: "Карбоновый графит", hex: "#2f3438", ui: "#7f8b94", finish: "Матовый", add: 390, filter: "brightness(.66) contrast(1.18)" },
        { id: "nickel", name: "Светлый никель", hex: "#c5c8c3", ui: "#d7ddd9", finish: "Перламутр", add: 590, filter: "grayscale(.4) brightness(1.24) contrast(.9)" }
      ],
      packages: [
        { id: "scan", name: "Scan Core", note: "Дрон, RTK, 3 батареи, жёсткий кейс", add: 0 },
        { id: "lidar", name: "LiDAR Pro", note: "Лидар 360°, базовая станция и ПО", add: 3990 },
        { id: "twin", name: "Digital Twin", note: "Лидар, 45 Мп камера и рабочая станция", add: 5290 }
      ],
      extras: [commonExtras.rtk, commonExtras.care, commonExtras.battery],
      story: "Силовая рама отделяет вибрации моторов от сенсорного блока. Серый металлик подчёркивает техническую форму, а нижний лидар получает свободный круговой обзор без деталей шасси.",
      features: [["Плотное облако", "До 2,4 миллиона точек в секунду сохраняют сложную геометрию объекта."], ["Стабильная ось", "Активная виброизоляция удерживает лидар в рассчитанном положении."], ["Цифровой двойник", "Лидар и фотограмметрия объединяются в единой привязанной модели."]],
      specs: [["Масса", "7,2 кг"], ["Время полёта", "до 44 минут"], ["Скорость лидарa", "2,4 млн точек/с"], ["Точность", "до 3 см"], ["Дальность связи", "до 17 км"], ["Навигация", "Dual RTK + IMU"]]
    }),
    ember: product({
      id: "ember",
      name: "MDR Ember Sprint",
      short: "EMBER SPRINT",
      displayLead: "MDR EMBER",
      displayAccent: "SPRINT",
      category: "speed",
      eyebrow: "Гоночная система быстрого реагирования",
      tagline: "Первый на точке.",
      description: "Ember Sprint — компактный аппарат для быстрых осмотров, FPV-сопровождения и тренировочных трасс. Красный корпус, защищённые каналы и мгновенная реакция созданы для активной траектории.",
      image: "assets/turntable/ember-front-v1.png",
      configImage: "assets/turntable/ember-front-v1.png",
      views: ["assets/turntable/ember-front-v1.png", "assets/turntable/ember-right-v1.png", "assets/turntable/ember-rear-v1.png", "assets/turntable/ember-left-v1.png"],
      imageAlt: "Ярко-красный скоростной дрон MDR Ember Sprint",
      accent: "#ff3b30",
      heroAccent: "#ff3b30",
      price: 11390,
      stats: [["178 км/ч", "пиковая скорость"], ["14 мс", "задержка видео"], ["6K", "экшн-камера"]],
      colors: [
        { id: "emberred", name: "Ember Red", hex: "#e9322a", ui: "#ff3b30", finish: "Глянцевый", add: 0, filter: "none" },
        { id: "crimson", name: "Глубокий кармин", hex: "#801c24", ui: "#dd4655", finish: "Металлик", add: 410, filter: "saturate(1.2) brightness(.68)" },
        { id: "frost", name: "Frost White", hex: "#e8e8e5", ui: "#f4f4ef", finish: "Перламутр", add: 560, filter: "grayscale(.86) brightness(1.38) contrast(.88)" }
      ],
      packages: [
        { id: "sprint", name: "Sprint Core", note: "Дрон, FPV-пульт, 4 аккумулятора", add: 0 },
        { id: "race", name: "Race Pack", note: "FPV-очки, 8 батарей и зарядная станция", add: 1990 },
        { id: "cinema", name: "Chase Cinema", note: "6K-камера, ND-набор и монитор режиссёра", add: 2690 }
      ],
      extras: [commonExtras.battery, commonExtras.care, commonExtras.academy],
      story: "Компактный монокок защищает электронику внутри и оставляет винтовые каналы свободными. Низкая камера читает направление движения, а яркий корпус помогает команде видеть аппарат на сложном фоне.",
      features: [["14 миллисекунд", "Низкая задержка видеолинии сохраняет точное чувство траектории."], ["Защищённые каналы", "Рама принимает касание на себя и помогает сохранить винты."], ["6K Chase", "Камера записывает динамичный кадр с запасом для стабилизации."]],
      specs: [["Масса", "1,85 кг"], ["Максимальная скорость", "до 178 км/ч"], ["Время полёта", "до 24 минут"], ["Задержка видео", "от 14 мс"], ["Камера", "6K / 60 fps"], ["Дальность связи", "до 9 км"]]
    })
  };

  window.MDR_PRODUCTS = products;
  window.MDR_MODEL_ORDER = Object.keys(products);
  window.MDR_MODEL_PAGE = pageFor;
  window.MDR_MONEY = (value) => money.format(value);

  const ensureStylesheet = (href) => {
    if (!document.querySelector(`link[href^="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${href}?v=12`;
      document.head.append(link);
    }
  };
  ensureStylesheet("overrides.css");
  ensureStylesheet("evolution.css");

  if (document.body.classList.contains("home-page")) {
    document.querySelectorAll("main > .hero:not(.home-hero), .model-list, .gallery-chip, .scroll-cue, .swipe-hint, .home-intro, .product-catalog").forEach((element) => element.remove());
    [...document.querySelectorAll("main > .home-hero")].slice(1).forEach((element) => element.remove());
  }

  document.querySelectorAll('a[href="about.html#contacts"], a[href="#contacts"]').forEach((link) => {
    link.href = "contacts.html";
  });

  document.querySelectorAll(".site-footer").forEach((footer) => {
    const email = footer.querySelector('a[href^="mailto:"]');
    const contactBlock = email?.closest("div");
    if (contactBlock && !contactBlock.querySelector('a[href^="tel:"]')) {
      const phone = document.createElement("a");
      phone.href = "tel:+998910018172";
      phone.textContent = "+998 91 001 81 72";
      email.insertAdjacentElement("afterend", phone);
    }
  });
})();
