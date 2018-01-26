// Сортировка по точности
function compareweight(a,b) {
    if (a.weight > b.weight) return -1;
    if (a.weight < b.weight) return 1;
    return 0;
}

// Сортировка по имени
function compareName(a,b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
}

// Объединение идентичных адресов в списке
function geoMerge(elements) {
    // Сортируем по точности
    elements.sort(compareweight);

    // Исключаем идентичные элементы
    var count = elements.length;
    var innerOffset = 1;

    for (var i = 0; i < count; i++) {
        if (!elements[i]) continue;
        for (var c = innerOffset; c < count; c++) {
            if (i == c || !elements[c]) continue;

            if (elements[i].compare(elements[c])) {
              elements[c] = null;
            }
        }

        innerOffset ++;
    }

    // Фильтруем исключённые
    var result = [];

    for (var i in elements) {
        if (elements[i]) result.push(elements[i]);
    }

    // Сортируем по имени
    result.sort(compareName);

    return result;
}

class address {
    constructor(data) {
        // Максимальное отклонение в метрах
        this.distanceThreshold = 10;

        this.name = data.name;
        this.lat = data.hasOwnProperty('lat') ? data.lat : null;
        this.lon = data.hasOwnProperty('lon') ? data.lon : null;
        this.weight = data.hasOwnProperty('weight') ? data.weight : null;;
        this.dict = {};
        this.dict.words = this.getWordsDict(this.name);
        this.dict.num = this.getNumsDict(this.name);
    }

    // Сравнивает два адреса по названию и расстоянию
    compare(item) {
        var result = {};

        // По словам
        // Повторение одинаковых слов не является достаточно весомым критерием уникальности для адреса
        var dict = this.dict['words'];
        var totalCount = Object.keys(dict).length;
        var matchCount = 0;

        for (var checkValue in dict) {
            if (item.dict['words'].hasOwnProperty(checkValue)) matchCount++;
        }

        result['words'] = matchCount ? Math.round((matchCount / totalCount) * 100) : 0;

        // По цифрам
        // Для нас важно точноее количество отдельных цифр, как решающий фактор для адреса.
        var dict = Object.assign({}, this.dict['num']);
        var targetDict = Object.assign({}, item.dict['num']);
        var totalCount = 0;
        var matchCount = 0;

        Object.keys(dict).map(function(key) { totalCount += dict[key]; });
        Object.keys(targetDict).map(function(key) { if (!dict.hasOwnProperty(key)) totalCount += targetDict[key]; else if (dict[key] < targetDict[key]) totalCount += targetDict[key] - dict[key]});

        for (var checkValue in dict) {
            if (targetDict.hasOwnProperty(checkValue)) {
                var delta = targetDict[checkValue];

                if (dict[checkValue] >= delta) {
                    matchCount += delta;
                    dict[checkValue] -= delta;
                } else {
                    matchCount += dict[checkValue]
                    dict[checkValue] = 0;
                }
            }
        }

        if (!totalCount) {
            result['num'] = 100;
        } else {
            result['num'] = matchCount ? Math.round((matchCount / totalCount) * 100) : 0;
        }

        if (this.lat !== null && this.log !== null && item.lat !== null && item.lon !== null) {
            var distance = this.haversine({lat: this.lat, lon: this.lon}, {lat: item.lat, lon: item.lon});

            var distanceCheck = distance < this.distanceThreshold;
        } else {
            var distanceCheck = true;
        }

        result['distance'] = distanceCheck;

        return (result['words'] >= 50 && result['num'] == 100 && result['distance']) ? true : false;
    }

    // Получает словарь слов
    getWordsDict() {
        var elements = {};
        var elementsList = this.name.split(/\s+|[,;]|\.[0-9]|[0-9]/);

        for (var i in elementsList) {
            var item = elementsList[i].trim();

            // Стоп-элементы
            var rePlace = /^(область|обл\.?|город|г\.?|г|гор\.?|село|сел\.?|сел|селение|поселение|поселок|посёлок|пос\.?|пос|рп\.?|рабочий посёлок|улица|ул\.?|ул|переулок|пер.?|пер-к|пл|пл\.?|п|п\.?|проезд|пр\.?|пр|пр-д|дом|д\.?|д|строение|стр\.?|стр|с\.?|c|корпус|корп\.?|корп|к)$/i;
            // Стоп-предлоги
            var rePrep = /^(а|без|безо|в|вне|во|да|для|до|за|и|из|изо|или|к|как|на|над|надо|не|ни|но|о|об|обо|около|от|ото|по|под|подо|при|про|с|сквозь|со|у|через)$/i;

            // Исключаем стоп-слова и пустые значения
            if (!item.length || item.match(rePlace) || item.match(rePrep) || item.match(/^[0-9]+$/)) continue;

            elements[item.toLowerCase()] = true;
        }

        return elements;
    }

    // Получает словарь чисел
    getNumsDict() {
        var elements = {};
        var matches = this.name.match(/[0-9]+([а-я-]{1,4}(?=[,.; $]))?/ig);

        for (var i in matches) {
            if (key > 999) continue;

            var key = matches[i];
            if (elements.hasOwnProperty(key)) elements[key]++; else elements[key] = 1
        }

        return elements;
    }

    // Определяет расстояние между двумя точками в метрах
    haversine (start, end) {
        var toRad = function (num) { return num * Math.PI / 180 }
        var R = 6371000;

        var dLat = toRad(end.lat - start.lat)
        var dLon = toRad(end.lon - start.lon)
        var lat1 = toRad(start.lat)
        var lat2 = toRad(end.lat)

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

        return R * c
    }
}