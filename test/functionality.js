var fs = require('fs');
var rimraf = require('rimraf');
var expect = require('chai').expect
var request = require('supertest');
var koa = require('koa');
var router = require('koa-router');
var multer = require('../');

describe('Functionality', function () {

    // delete the temp dir after the tests are run
    after(function (done) { rimraf('./temp', done); });
    after(function (done) { rimraf('./temp2', done); });
    after(function (done) { rimraf('./temp3', done); });

    var app = koa();
    app.use(multer({
        dest: './temp',
        rename: function (fieldname, filename) {
            return fieldname + filename;
        }
    }));
    app.use(router(app));
    app.post('/', function* (next) {
        var form = {
            body: this.req.body,
            files: this.req.files
        }
        this.body = form;
    });


    it('should upload the file to the `dest` dir', function (done) {
        request(app.listen())
            .post('/')
            .type('form')
            .attach('small0', __dirname + '/files/small0.dat')
            .expect(200)
            .end(function (err, res) {
                var form = res.body;
                expect(err).to.be.null;
                expect(fs.existsSync('./temp/small0small0.dat')).to.equal(true);
                done();
            })
    })


    it('should rename the uploaded file', function (done) {
        request(app.listen())
            .post('/')
            .type('form')
            .attach('small0', __dirname + '/files/small0.dat')
            .expect(200)
            .end(function (err, res) {
                var form = res.body;
                expect(err).to.be.null;
                expect(form.files.small0.name).to.equal('small0small0.dat');
                done();
            })
    })

    var app2 = koa();
    app2.use(multer({
        dest: './temp2',
        putSingleFilesInArray: true,
        rename: function (fieldname, filename) {
            return fieldname + filename;
        }
    }));
    app2.use(router(app2));
    app2.post('/', function* (next) {
        var form = {
            body: this.req.body,
            files: this.req.files
        }
        this.body = form;
    });

    it('should ensure all req.files values (single-file per field) point to an array', function (done) {
        request(app2.listen())
            .post('/')
            .type('form')
            .attach('tiny0', __dirname + '/files/tiny0.dat')
            .expect(200)
            .end(function (err, res) {
                var form = res.body;
                expect(err).to.be.null;
                expect(form.files.tiny0.length).to.equal(1);
                expect(form.files.tiny0[0].name).to.equal('tiny0tiny0.dat');
                done();
            })
    })

    it('should ensure all req.files values (multi-files per field) point to an array', function (done) {
        request(app2.listen())
            .post('/')
            .type('form')
            .attach('small0', __dirname + '/files/small0.dat')
            .attach('small0', __dirname + '/files/small1.dat')
            .expect(200)
            .end(function (err, res) {
                var form = res.body;
                expect(err).to.be.null;
                expect(form.files.small0.length).to.equal(2);
                expect(form.files.small0[0].name).to.equal('small0small0.dat');
                expect(form.files.small0[1].name).to.equal('small0small1.dat');
                done();
            })
    })

    var app3 = koa();
    app3.use(multer({
        dest: './temp3',
        changeDest: function (dest, req, res) {
            dest += '/user1';

            var stat = null;

            try {
                stat = fs.statSync(dest);
            } catch(err) {
                // for nested folders, look at npm package "mkdirp"
                fs.mkdirSync(dest);
            }

            if (stat && !stat.isDirectory()) {
                // Woh! This file/link/etc already exists, so isn't a directory. Can't save in it. Handle appropriately.
                throw new Error('Directory cannot be created because an inode of a different type exists at "' + dest + '"');
            }

            return dest;
        },
        rename: function (fieldname, filename) {
            return fieldname + filename;
        }
    }));
    app3.use(router(app3));
    app3.post('/', function* (next) {
        var form = {
            body: this.req.body,
            files: this.req.files
        }
        this.body = form;
    });

    it('should rename the `dest` directory to a different directory', function (done) {
        request(app3.listen())
            .post('/')
            .type('form')
            .attach('small0', __dirname + '/files/small0.dat')
            .expect(200)
            .end(function (err, res) {
                var form = res.body;
                expect(err).to.be.null;
                expect(fs.existsSync('./temp3/user1/small0small0.dat')).to.equal(true);
                done();
            })
    })

})