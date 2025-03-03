var roi = table.filterBounds(geometry)
Map.addLayer(roi)

var viirs = imageCollection.select(['I1', 'I2'])
.filterDate('2017-10-08', '2017-10-10')

Map.addLayer(viirs.toBands().clip(roi), [], 'before viirs_wildfire', false)
Map.addLayer(viirs.toBands().clip(roi), [], 'after viirs_wildfire', false)

Map.centerObject(geometry2)

var before = imageCollection2.select(['SR_.*'])
.filterDate('2016', '2017')
.filter(ee.Filter.calendarRange(10, 10, 'month'))
.filterBounds(geometry2);

Map.addLayer(before.median().clip(geometry2),{bands: ['SR_B5', 'SR_B4', 'SR_B3']}, 'before rgb', false)

var after = imageCollection2.select(['SR_.*'])
.filterDate('2018', '2019')
.filter(ee.Filter.calendarRange(10, 10, 'month'))
.filterBounds(geometry2);

Map.addLayer(after.median().clip(geometry2),{bands: ['SR_B5', 'SR_B4', 'SR_B3']}, 'after rgb', false)

print(before.first())

var ndvi_bf = before.map(function(img){
  var gain = ee.Number(img.get('REFLECTANCE_MULT_BAND_5'))
  var offset = ee.Number(img.get('REFLECTANCE_ADD_BAND_3'))
  var sr = img.multiply(gain).add(offset)
  var ndvi = sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('ndvi_before')
  return ndvi
}).median();

var ndvi_after = after.map(function(img){
  var gain = ee.Number(img.get('REFLECTANCE_MULT_BAND_5'))
  var offset = ee.Number(img.get('REFLECTANCE_ADD_BAND_3'))
  var sr = img.multiply(gain).add(offset)
  var ndvi = sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('ndvi_before')
  return ndvi
}).median();

Map.addLayer(ndvi_bf.clip(geometry2), [], 'ndvi_before', false)
Map.addLayer(ndvi_after.clip(geometry2), [], 'ndvi_after', false)

print(
  ui.Chart.image.histogram(ndvi_bf, geometry2, 100)
  .setOptions({
    title: 'NDVI before 2016'
    })
  )
  
print(
  ui.Chart.image.histogram(ndvi_after, geometry2, 100)
  .setOptions({
    title: 'NDVI after 2017'
    })
  )
  
var ndvi_change = ndvi_bf.subtract(ndvi_after)

Map.addLayer(ndvi_change.clip(geometry2), [], 'ndvi_Change', false)

var water = imageCollection3.select('label').mode().eq(0).not();

Map.addLayer(water.clip(geometry2), [], 'water_mask', false)

var ndvi_change_masked = ndvi_change.updateMask(water);

Map.addLayer(ndvi_change_masked.clip(geometry2), [], 'ndvi_Change_masked', false)

Export.image.toDrive({
  image: ndvi_change_masked.clip(geometry2),
  description: 'wildfire_change',
  scale: 100,
  maxPixels: 1e13,
  region: geometry2,
  crs: 'EPSG:4326'
  })
  
var thr = ndvi_change_masked.gt(0.1);
var mask = thr.updateMask(thr);

Map.addLayer(mask.clip(geometry2), [], 'mask', false)

var area = mask.multiply(ee.Image.pixelArea().divide(1e6));

var final_area = ee.Number(area.reduceRegion(ee.Reducer.sum(), geometry2, 100).values().get(0))

print(final_area)