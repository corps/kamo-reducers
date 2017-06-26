#!/bin/bash

mv qunit.d.ts qunit
rm all.d.ts

tsc -d
rm *.test.d.ts
echo "" > all

for f in */*.d.ts; do
  module=${f%%.*}
  echo "Module $module"
  echo "declare module \"kamo-reducers/$module\" {" >> all
  moduleDir=`dirname $module`
  (cat $f | sed -e 's/declare//g' | sed -e 's@from \"../@from \"kamo-reducers/@g' | sed -e 's@from \"./@from \"kamo-reducers/'"$moduleDir"'/@g') >> all
  echo "}" >> all
done

for f in *.d.ts; do
  module=${f%%.*}
  echo "Module $module"
  echo "declare module \"kamo-reducers/$module\" {" >> all
  (cat $f | sed -e 's/declare//g' | sed -e 's@from \"./@from \"kamo-reducers/@g') >> all
  echo "}" >> all
done

rm *.d.ts
rm */*.d.ts

mv qunit qunit.d.ts
mv all all.d.ts