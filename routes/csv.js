/**
 * Created with JetBrains WebStorm.
 * User: 松松
 * Date: 12-7-31
 * Time: 下午5:12
 * 关于CSV乱码的问题：
 * http://www.phpv.net/html/1675.html
 * http://www.docin.com/p-31710590.html
 * http://gitlab.alibaba-inc.com/edp/show-me-the-code/blob/master/2012/0920/ziyin.md
 */

'use strict';

function initDate(str) {
    var date = str.split('-');
    var _date = new Date();
    var year = parseInt(date[0], 10);

    if (!isNaN(year) && year.toString().length === 4) {
        _date.setFullYear(year);
    } else {
        return false;
    }

    var month = parseInt(date[1], 10);
    if (month >= 1 && month <= 12) {
        _date.setMonth(month - 1)
    } else {
        return false;
    }

    var date = parseInt(date[2], 10);
    if (date >= 1 && date <= require('../helper/date').getMaxDays(_date, _date.getMonth())) {
        _date.setDate(date);
    } else {
        return false;
    }
    _date.setHours(0, 0, 0, 0);
    return _date;
}

exports.download = function (req, res) {

    var DB = require('../helper/db');
    var r = {};

    var start = initDate(req.params[0]);
    var end = initDate(req.params[1]);

    res.header('Content-Type', 'text/html;charset=utf-8');

    if (!start || !end) {
        res.render('table-error', {layout: false, host: req.headers.host, msg: "起始或结束日期不正确"})
        return;
    }
    if (start.getTime() > end.getTime()) {
        res.render('table-error', {layout: false, host: req.headers.host, msg: "起始日期不能大于结束日期"})
        return;
    }

    end.setHours(23, 59, 59, 999);

    var filter = {completion_date: {'$gte': start.getTime(), '$lte': end.getTime()}, level: {'$gt': 0} }

    var user = require('../helper/user').frontList;

    Object.keys(user).forEach(function (item) {
        r['id_' + user[item].id] = {
            name: user[item].name,
            "real-name": user[item]['real-name'],
            level1: 0,
            level2: 0,
            level3: 0,
            level4: 0
        }
    });


    var logCollection = new DB.mongodb.Collection(DB.client, 'log');

    logCollection.find(filter, {}).toArray(function (err, result) {

        result.forEach(function (item) {
            if (item.leave === undefined) r['id_' + item.front]['level' + item.level]++;
        });

        Object.keys(r).forEach(function (key) {
            r[key].levelCount = r[key].level1 + r[key].level2 + r[key].level3 + r[key].level4;
            r[key].oh = r[key].level1 * 20 + r[key].level2 * 30 + r[key].level3 * 50 + r[key].level4 * 100;
        });

        var list = {};
        list.arr = [];
        Object.keys(r).forEach(function (k) {
            var o = r[k];
            list.arr.push([o['real-name'], o.name, o.level1, o.level2, o.level3, o.level4, o.levelCount, o.oh]);
        });

        res.render('table', {layout: false, arr: list.arr, start: start, end: end, path: req.path.replace('csv', 'history')})
    });
};
