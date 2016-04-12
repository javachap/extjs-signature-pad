Ext.define('Ext.ux.sign.Point', {
    
    x: undefined,
    
    y: undefined,
    
    time:  new Date().getTime(),
    
    constructor: function (x, y, time) {
        this.x = x;
        this.y = y;
        this.time = time || new Date().getTime();
        this.callParent(arguments);
    },

    velocityFrom: function (start) {
        return (this.time !== start.time) ? this.distanceTo(start) / (this.time - start.time) : 1;
    },

    distanceTo: function (start) {
        return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
    }
});