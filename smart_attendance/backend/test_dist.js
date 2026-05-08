require('dotenv').config({ path: '.env' });
const connectDB = require('./config/database');
const Student = require('./models/Student');

function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

async function run() {
  await connectDB();
  const students = await Student.find({ faceDescriptor: { $exists: true, $ne: [] } }).select('+faceDescriptor');
  const d1 = students[0].faceDescriptor;
  
  // Test 1: Mongoose array vs Mongoose array -> should be 0
  console.log('Distance to self (Mongoose):', euclideanDistance(d1, d1));
  
  // Test 2: Mongoose array converted to JS array vs Mongoose array
  const jsArr = Array.from(d1);
  console.log('Distance to self (JS Array vs Mongoose):', euclideanDistance(jsArr, d1));

  // Test 3: What if we JSON.stringify the array and parse it like Express does
  const parsed = JSON.parse(JSON.stringify(jsArr));
  console.log('Distance to self (Parsed vs Mongoose):', euclideanDistance(parsed, d1));

  process.exit();
}
run();
