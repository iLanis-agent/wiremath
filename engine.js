/* WireMath engine - wire gauge and voltage drop math. Pure functions, no DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WireMath = api;
}(typeof self !== 'undefined' ? self : this, function () {

  // Copper at 75C: ohms per 1000 ft, and a conservative ampacity (60C cord /
  // 75C in-conduit, whichever is kinder to the homeowner).
  var AWG = {
    '16': { r: 4.09, amp: 13 },
    '14': { r: 2.58, amp: 15 },
    '12': { r: 1.62, amp: 20 },
    '10': { r: 1.02, amp: 30 },
    '8':  { r: 0.64, amp: 40 },
    '6':  { r: 0.40, amp: 55 }
  };
  var GAUGES = ['16', '14', '12', '10', '8', '6'];
  var PCT_WARN = 3; // NEC 210.19 fine-print: 3% max on a branch circuit
  var PCT_BAD = 5;  // 5% max feeder + branch combined

  function r2(x) { return Math.round(x * 100) / 100; }

  function ampsFromWatts(watts, volts) {
    if (volts <= 0) return 0;
    return r2(watts / volts);
  }

  // Round-trip drop: current goes out and comes back, so 2 x length.
  function voltageDrop(amps, lengthFt, awg) {
    var g = AWG[awg];
    if (!g) return null;
    return r2(2 * amps * lengthFt * g.r / 1000);
  }

  function dropPct(vDrop, volts) {
    if (volts <= 0) return 0;
    return r2(vDrop / volts * 100);
  }

  // Watts turned into heat along the run (I2R, both conductors).
  function heatWatts(amps, lengthFt, awg) {
    var g = AWG[awg];
    if (!g) return null;
    return r2(amps * amps * 2 * lengthFt * g.r / 1000);
  }

  // Longest run that keeps the drop under 3%.
  function maxLenFt(amps, volts, awg) {
    var g = AWG[awg];
    if (!g || amps <= 0) return 0;
    return Math.floor(0.03 * volts * 1000 / (2 * amps * g.r));
  }

  function levelFor(pct) {
    if (pct > PCT_BAD) return 'bad';
    if (pct > PCT_WARN) return 'warn';
    return 'good';
  }

  // Same load on every gauge: the honest comparison table.
  function compare(amps, lengthFt, volts) {
    return GAUGES.map(function (awg) {
      var vd = voltageDrop(amps, lengthFt, awg);
      var pct = dropPct(vd, volts);
      return { awg: awg, vDrop: vd, pct: pct, level: levelFor(pct), maxLenFt: maxLenFt(amps, volts, awg) };
    });
  }

  function checks(res, input) {
    var out = [];
    var g = AWG[input.awg];
    if (res.amps > g.amp) {
      out.push({ level: 'bad', text: res.amps + ' A on ' + input.awg + ' AWG exceeds its ' + g.amp + ' A ampacity - the wire itself is the fuse now.' });
    } else if (input.continuous && res.amps * 1.25 > g.amp) {
      out.push({ level: 'warn', text: 'Continuous loads derate 125%: ' + res.amps + ' A counts as ' + r2(res.amps * 1.25) + ' A - over ' + g.amp + ' A on ' + input.awg + ' AWG. Size up.' });
    } else {
      out.push({ level: 'good', text: res.amps + ' A sits under the ' + g.amp + ' A ampacity of ' + input.awg + ' AWG.' });
    }
    if (res.pct > PCT_BAD) {
      out.push({ level: 'bad', text: 'Drop ' + res.pct + '% (' + res.vDrop + ' V) blows past the 5% combined limit - the tool at the far end is starving and the cord is a heater.' });
    } else if (res.pct > PCT_WARN) {
      out.push({ level: 'warn', text: 'Drop ' + res.pct + '% (' + res.vDrop + ' V) is over the 3% branch-circuit rule - marginal, and motors will feel it.' });
    } else {
      out.push({ level: 'good', text: 'Drop ' + res.pct + '% (' + res.vDrop + ' V) is inside the 3% rule.' });
    }
    if (res.heatWatts >= 25) {
      out.push({ level: 'warn', text: res.heatWatts + ' W of heat along the run - do not leave that coiled.' });
    }
    if (input.continuous && res.amps * 1.25 > g.amp) {
      out.push({ level: 'warn', text: 'Breaker for a continuous load: 125% of ' + res.amps + ' A = ' + Math.ceil(res.amps * 1.25) + ' A minimum rating.' });
    }
    return out;
  }

  function compute(input) {
    var volts = +(input.volts || 120);
    var amps = input.amps != null && input.amps !== '' ? +input.amps : ampsFromWatts(+input.watts || 0, volts);
    var len = +input.lengthFt, awg = String(input.awg);
    if (!(amps > 0) || !(len > 0) || !AWG[awg]) return { error: 'Need a positive load, a positive length, and a gauge.' };
    var vd = voltageDrop(amps, len, awg);
    var res = {
      amps: r2(amps), volts: volts, lengthFt: len, awg: awg,
      vDrop: vd, pct: dropPct(vd, volts),
      heatWatts: heatWatts(amps, len, awg),
      atEndVolts: r2(volts - vd),
      maxLenFt: maxLenFt(amps, volts, awg),
      table: compare(amps, len, volts)
    };
    res.checks = checks(res, { awg: awg, continuous: !!input.continuous });
    return res;
  }

  return {
    AWG: AWG, GAUGES: GAUGES, PCT_WARN: PCT_WARN, PCT_BAD: PCT_BAD,
    ampsFromWatts: ampsFromWatts, voltageDrop: voltageDrop, dropPct: dropPct,
    heatWatts: heatWatts, maxLenFt: maxLenFt, levelFor: levelFor,
    compare: compare, checks: checks, compute: compute
  };
}));
