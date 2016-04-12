Ext.define('Divine.extn.sign.SignaturePad',  {
    
    extend: 'Ext.Component',
    
    requires: ['Divine.extn.sign.Bezier', 'Divine.extn.sign.Point'],
    
    xtype: 'signaturePad',
    
    velocityFilterWeight:  0.7,
    
    minBrushWidth: 0.5,
    
    maxBrushWidth: 2.5,
    
    dotSize: function () {
        return (this.minBrushWidth + this.maxBrushWidth) / 2;
    },
    
    penColor: 'black',
    
    backgroundColor: "rgba(0,0,0,0)",
    
    onEnd: undefined,
    
    onBegin: undefined,
    
    autoEl: {
        tag: 'canvas'
    },
    
    initComponent: function() {
        
        this.callParent(arguments);
        
        var self = this;
        this.on('boxready', this.initCanvas, this);
       
        // we need add these inline so they are available to unbind while still having
        //  access to 'self' we could use _.bind but it's not worth adding a dependency
        this._handleMouseDown = function (event) {
            if (event.which === 1) {
                self._mouseButtonDown = true;
                self._strokeBegin(event);
            }
        };

        this._handleMouseMove = function (event) {
            if (self._mouseButtonDown) {
                self._strokeUpdate(event);
            }
        };

        this._handleMouseUp = function (event) {
            if (event.which === 1 && self._mouseButtonDown) {
                self._mouseButtonDown = false;
                self._strokeEnd(event);
            }
        };

        this._handleTouchStart = function (event) {
            var touch = event.changedTouches[0];
            self._strokeBegin(touch);
        };

        this._handleTouchMove = function (event) {
            // Prevent scrolling.
            event.preventDefault();

            var touch = event.changedTouches[0];
            self._strokeUpdate(touch);
        };

        this._handleTouchEnd = function (event) {
            var wasCanvasTouched = event.target === self._canvas;
            if (wasCanvasTouched) {
                self._strokeEnd(event);
            }
        };
    },     
   
    
    initCanvas: function(){     
        var me = this,
            canvas = this.getEl().dom;
        if (canvas) {         
            me._canvas = canvas;
            canvas.height = this.getHeight();
            canvas.width = this.getWidth();
            me._ctx = canvas.getContext("2d");
            me.clear();
            me._handleMouseEvents();
            me._handleTouchEvents();
        }
    },
    
    clear: function() {
        var ctx = this._ctx,
            canvas = this._canvas;
        ctx.fillStyle = this.backgroundColor;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this._reset();
    },

    toDataURL: function(imageType, quality) {
        var canvas = this._canvas;
        return canvas.toDataURL.apply(canvas, arguments);
    },

    fromDataURL: function(dataUrl) {
        var self = this,
            image = new Image(),
            ratio = window.devicePixelRatio || 1,
            width = this._canvas.width / ratio,
            height = this._canvas.height / ratio;
        this._reset();
        image.src = dataUrl;
        image.onload = function () {
            self._ctx.drawImage(image, 0, 0, width, height);
        };
        this._isEmpty = false;
    },

    _strokeUpdate: function(event) {
        var point = this._createPoint(event);
        this._addPoint(point);
    },

    _strokeBegin: function(event) {
        this._reset();
        this._strokeUpdate(event);
        if (typeof this.onBegin === 'function') {
            this.onBegin(event);
        }
    },

    _strokeDraw: function(point) {
        var ctx = this._ctx,
            dotSize = typeof(this.dotSize) === 'function' ? this.dotSize() : this.dotSize;

        ctx.beginPath();
        this._drawPoint(point.x, point.y, dotSize);
        ctx.closePath();
        ctx.fill();
    },

    _strokeEnd: function(event) {
        var canDrawCurve = this.points.length > 2,
            point = this.points[0];

        if (!canDrawCurve && point) {
            this._strokeDraw(point);
        }
        if (typeof this.onEnd === 'function') {
            this.onEnd(event);
        }
    },

    _handleMouseEvents: function() {
        this._mouseButtonDown = false;

        this._canvas.addEventListener("mousedown", this._handleMouseDown);
        this._canvas.addEventListener("mousemove", this._handleMouseMove);
        document.addEventListener("mouseup", this._handleMouseUp);
    },

    _handleTouchEvents: function() {
        // Pass touch events to canvas element on mobile IE.
        this._canvas.style.msTouchAction = 'none';

        this._canvas.addEventListener("touchstart", this._handleTouchStart);
        this._canvas.addEventListener("touchmove", this._handleTouchMove);
        document.addEventListener("touchend", this._handleTouchEnd);
    },

    off: function() {
        this._canvas.removeEventListener("mousedown", this._handleMouseDown);
        this._canvas.removeEventListener("mousemove", this._handleMouseMove);
        document.removeEventListener("mouseup", this._handleMouseUp);

        this._canvas.removeEventListener("touchstart", this._handleTouchStart);
        this._canvas.removeEventListener("touchmove", this._handleTouchMove);
        document.removeEventListener("touchend", this._handleTouchEnd);
    },

    isEmpty: function() {
        return this._isEmpty;
    },

    _reset: function() {
        this.points = [];
        this._lastVelocity = 0;
        this._lastWidth = (this.minBrushWidth + this.maxBrushWidth) / 2;
        this._isEmpty = true;
        this._ctx.fillStyle = this.penColor;
    },

    _createPoint: function(event) {
        var rect = this._canvas.getBoundingClientRect();
        return new Divine.extn.sign.Point(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    },

    _addPoint: function(point) {
        var points = this.points,
            c2, c3,
            curve, tmp;

        points.push(point);

        if (points.length > 2) {
            // To reduce the initial lag make it work with 3 points
            // by copying the first point to the beginning.
            if (points.length === 3) points.unshift(points[0]);

            tmp = this._calculateCurveControlPoints(points[0], points[1], points[2]);
            c2 = tmp.c2;
            tmp = this._calculateCurveControlPoints(points[1], points[2], points[3]);
            c3 = tmp.c1;
            curve = new Divine.extn.sign.Bezier(points[1], c2, c3, points[2]);
            this._addCurve(curve);

            // Remove the first element from the list,
            // so that we always have no more than 4 points in points array.
            points.shift();
        }
    },

    _calculateCurveControlPoints: function(s1, s2, s3) {
        var dx1 = s1.x - s2.x, dy1 = s1.y - s2.y,
            dx2 = s2.x - s3.x, dy2 = s2.y - s3.y,

            m1 = {x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0},
            m2 = {x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0},

            l1 = Math.sqrt(dx1*dx1 + dy1*dy1),
            l2 = Math.sqrt(dx2*dx2 + dy2*dy2),

            dxm = (m1.x - m2.x),
            dym = (m1.y - m2.y),

            k = l2 / (l1 + l2),
            cm = {x: m2.x + dxm*k, y: m2.y + dym*k},

            tx = s2.x - cm.x,
            ty = s2.y - cm.y;

        return {
            c1: new Divine.extn.sign.Point(m1.x + tx, m1.y + ty),
            c2: new Divine.extn.sign.Point(m2.x + tx, m2.y + ty)
        };
    },

    _addCurve: function(curve) {
        var startPoint = curve.startPoint,
            endPoint = curve.endPoint,
            velocity, newWidth;

        velocity = endPoint.velocityFrom(startPoint);
        velocity = this.velocityFilterWeight * velocity
            + (1 - this.velocityFilterWeight) * this._lastVelocity;

        newWidth = this._strokeWidth(velocity);
        this._drawCurve(curve, this._lastWidth, newWidth);

        this._lastVelocity = velocity;
        this._lastWidth = newWidth;
    },

    _drawPoint: function(x, y, size) {
        var ctx = this._ctx;

        ctx.moveTo(x, y);
        ctx.arc(x, y, size, 0, 2 * Math.PI, false);
        this._isEmpty = false;
    },

    _drawCurve: function(curve, startWidth, endWidth) {
        var ctx = this._ctx,
            widthDelta = endWidth - startWidth,
            drawSteps, width, i, t, tt, ttt, u, uu, uuu, x, y;

        drawSteps = Math.floor(curve.length());
        ctx.beginPath();
        for (i = 0; i < drawSteps; i++) {
            // Calculate the Bezier (x, y) coordinate for this step.
            t = i / drawSteps;
            tt = t * t;
            ttt = tt * t;
            u = 1 - t;
            uu = u * u;
            uuu = uu * u;

            x = uuu * curve.startPoint.x;
            x += 3 * uu * t * curve.control1.x;
            x += 3 * u * tt * curve.control2.x;
            x += ttt * curve.endPoint.x;

            y = uuu * curve.startPoint.y;
            y += 3 * uu * t * curve.control1.y;
            y += 3 * u * tt * curve.control2.y;
            y += ttt * curve.endPoint.y;

            width = startWidth + ttt * widthDelta;
            this._drawPoint(x, y, width);
        }
        ctx.closePath();
        ctx.fill();
    },

    _strokeWidth: function(velocity) {
        return Math.max(this.maxBrushWidth / (velocity + 1), this.minBrushWidth);
    }
});