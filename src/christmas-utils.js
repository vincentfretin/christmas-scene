function recenterGeometry(geometry) {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();

  center.addVectors(geometry.boundingBox.min, geometry.boundingBox.max);
  center.multiplyScalar(0.5);
  geometry.translate(-center.x, -center.y, -center.z)
  geometry.computeBoundingBox();
}

AFRAME.registerGeometry('branch', {
  schema: {
  },

  init: function (data) {
    //radiusTop, radiusBottom, height, radialSegments
    const geometries = []
    // 3 initial long segments
    geometries.push(new THREE.CylinderGeometry(0.09, 0.1, 1, 7));
    geometries.push(new THREE.CylinderGeometry(0.08, 0.09, 1, 7));
    geometries.push(new THREE.CylinderGeometry(0.07, 0.08, 1, 7));
    // 3 "fingers" of varying lengths & girths
    geometries.push(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 7));
    geometries.push(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 7));
    geometries.push(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 7));

    // now position these relative to each other.
    geometries[0].translate(0.14, -0.9, 0);
    geometries[1].rotateZ(0.3);
    geometries[2].translate(-0.14, 0.9, 0);
    geometries[3].translate(0.14, 1.62, 0);
    geometries[3].rotateZ(0.2);
    geometries[4].translate(0.4, 1.5, 0);
    geometries[4].rotateZ(0.5);
    geometries[5].translate(-0.8, 1.5, 0);
    geometries[5].rotateZ(-0.5);

    this.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);

    recenterGeometry(this.geometry);
  }
});

AFRAME.registerGeometry('tophat', {
  schema: {
  },

  init: function (data) {
    //radiusTop, radiusBottom, height, radialSegments
    const geometries = [];
    // 3 initial long segments
    geometries.push(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 11));
    geometries.push(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 11));
    geometries[1].translate(0, 0.15, 0);
    this.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);

    recenterGeometry(this.geometry);
  }
});

AFRAME.registerGeometry('icicle', {
  schema: {
  },

  init: function (data) {

    const geometries = [];
    // 3 cylinders, getting gradually pointier
    //radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded
    geometries.push(new THREE.CylinderGeometry(0.2, 0.1, 0.25, 9, 1, true));
    geometries.push(new THREE.CylinderGeometry(0.1, 0.05, 0.25, 9, 1, true));
    geometries[1].translate(0, -0.25, 0);
    geometries.push(new THREE.CylinderGeometry(0.05, 0.01, 0.5, 9, 1, true));
    geometries[2].translate(0, -0.6, 0);

    this.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);

    recenterGeometry(this.geometry);
  }
});

AFRAME.registerComponent('cylindrical-position', {
  schema: {
    height: {type: 'number', default: 1.6},
    radius: {type: 'number', default: 1},
    angle: {type: 'number', default: 0},
    faceInward: {type: 'boolean', default: true},
  },

  update() {
    const radians = Math.PI * this.data.angle / 180

    this.el.object3D.position.x = this.data.radius * Math.sin(radians)
    this.el.object3D.position.y = this.data.height
    this.el.object3D.position.z = -this.data.radius * Math.cos(radians)

    this.el.object3D.rotation.x = 0
    this.el.object3D.rotation.y = -radians + (this.data.faceInward ? 0 : Math.PI)
    this.el.object3D.rotation.z = 0
  },
});

const CHRISTMAS_XYL_NOTES = [
  '#xC',
  '#xD',
  '#xE',
  '#xF',
  '#xG',
  '#xA',
  '#xB',
  '#xC2'
]

AFRAME.registerComponent('xylophone', {
  schema: {
    count: {type: 'number', default: 5},
    width: {type: 'number', default: 1},
    factor: {type: 'number', default: 1.1}
  },

  init() {

    this.notes = [];
    var baseWidth = 0.4; // base width of icicle model
    var totalWidth = 0;

    // compute how large the total construction will be.
    for (var ii = 0; ii < this.data.count; ii++) {
      totalWidth += baseWidth * Math.pow(this.data.factor, ii);
    }

    const scaleFactor = this.data.width / totalWidth;
    var xPos = -this.data.width / 2;

    for (var ii = 0; ii < this.data.count; ii++) {
      const note = document.createElement('a-entity');
      note.setAttribute('geometry', 'primitive:icicle');
      note.setAttribute('material', 'color:white;metalness:0.8;roughness:0.2;envMap:#env');
      const noteIndex = Math.max(7 - ii, 0);
      note.setAttribute('musical-note', `note: ${CHRISTMAS_XYL_NOTES[noteIndex]}`);
      const scale = scaleFactor * Math.pow(this.data.factor, ii);
      note.object3D.scale.set(scale, scale, scale);
      xPos += (scale * baseWidth / 2)
      note.object3D.position.x = xPos;
      xPos += (scale * baseWidth / 2)
      note.object3D.position.y = -scale / 2

      this.el.appendChild(note);
      this.notes.push(note)
    }
  }
});

AFRAME.registerComponent('musical-note', {
  schema: {
    note: {type: 'selector', default: '#xC'}
  },

  init() {
    // for collision detection, we need a static physics object.
    this.el.setAttribute('ammo-body', 'type: static; emitCollisionEvents: true');
    this.el.setAttribute('ammo-shape', 'type: hull');

    this.el.setAttribute('sound', {src: `#${this.data.note.id}`});

    // event listener to play on collide.
    this.el.addEventListener('collidestart', this.onCollide.bind(this));
  },

  onCollide() {

    // we stop before playing, to allow for the same not to play twice
    // in a row, quickly.
    this.el.components['sound'].stopSound();
    this.el.components['sound'].playSound();
  }
});

AFRAME.registerComponent('calendar', {
  schema: {
    width: {type: 'number', default: 0.3},
    height: {type: 'number', default: 0.3},
    depth: {type: 'number', default: 0.1}
  },

  init() {

    this.date = new Date();

    const language = navigator.language || navigator.browserLanguage || ( navigator.languages || [ "en" ] ) [ 0 ]

    const day = this.date.getDate()
    const weekdayOptions = { weekday: 'long'};
    const weekday = this.date.toLocaleDateString(language, weekdayOptions);
    const monthOptions = { month: 'long'};
    const month = this.date.toLocaleDateString(language, monthOptions);

    this.box = document.createElement('a-box');
    this.box.setAttribute('height', this.data.height);
    this.box.setAttribute('width', this.data.width);
    this.box.setAttribute('depth', this.data.depth);
    this.box.setAttribute('color', '#f88');
    this.el.appendChild(this.box);

    this.day = document.createElement('a-text');
    this.day.setAttribute('width', this.data.width);
    this.day.setAttribute('align', 'center');
    this.day.setAttribute('wrap-count', 3);
    this.day.setAttribute('value', day);
    this.day.setAttribute('color', 'black');
    this.day.object3D.position.z = this.data.depth / 2;
    this.box.appendChild(this.day);

    this.weekday = document.createElement('a-text');
    this.weekday.setAttribute('width', this.data.width);
    this.weekday.setAttribute('align', 'center');
    this.weekday.setAttribute('wrap-count', 15);
    this.weekday.setAttribute('value', weekday);
    this.weekday.setAttribute('color', 'black');
    this.weekday.object3D.position.y = this.data.height / 3;
    this.weekday.object3D.position.z = this.data.depth / 2;
    this.box.appendChild(this.weekday);

    this.month = document.createElement('a-text');
    this.month.setAttribute('width', this.data.width);
    this.month.setAttribute('align', 'center');
    this.month.setAttribute('wrap-count', 15);
    this.month.setAttribute('value', month);
    this.month.setAttribute('color', 'black');
    this.month.object3D.position.y = -(this.data.height / 3);
    this.month.object3D.position.z = this.data.depth / 2;
    this.box.appendChild(this.month);
  }
});

AFRAME.registerComponent('xmas-counter', {
  schema: {
    width: {type: 'number', default: 0.3},
    height: {type: 'number', default: 0.3},
    depth: {type: 'number', default: 0.1}
  },

  init() {

    this.date = new Date();
    const year = this.date.getFullYear();
    // months are zero-based so December = 11...(!)
    var nextChristmas = new Date(year, 11, 25);

    if (this.date > nextChristmas) {
      nextChristmas = new Date(year + 1, 11, 25);
    }

    const differenceMsecs = nextChristmas.getTime() - this.date.getTime();
    const daysToGo = Math.ceil(differenceMsecs / (1000 * 3600 * 24));

    this.box = document.createElement('a-box');
    this.box.setAttribute('height', this.data.height);
    this.box.setAttribute('width', this.data.width);
    this.box.setAttribute('depth', this.data.depth);
    this.box.setAttribute('color', '#8f8');
    this.el.appendChild(this.box);

    this.day = document.createElement('a-text');
    this.day.setAttribute('width', this.data.width);
    this.day.setAttribute('align', 'center');
    this.day.setAttribute('wrap-count', 3);
    this.day.setAttribute('value', daysToGo);
    this.day.setAttribute('color', 'black');
    this.day.object3D.position.y = this.data.height / 6;
    this.day.object3D.position.z = this.data.depth / 2;
    this.box.appendChild(this.day);

    this.caption = document.createElement('a-text');
    this.caption.setAttribute('width', this.data.width);
    this.caption.setAttribute('align', 'center');
    this.caption.setAttribute('wrap-count', 15);
    this.caption.setAttribute('value', "days to\nChristmas");
    this.caption.setAttribute('color', 'black');
    this.caption.object3D.position.y = -this.data.height / 4;
    this.caption.object3D.position.z = this.data.depth / 2;
    this.box.appendChild(this.caption);
  }
});