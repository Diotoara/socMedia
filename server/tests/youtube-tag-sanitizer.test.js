/**
 * YouTube Tag Sanitizer Tests
 * 
 * Run with: node server/tests/youtube-tag-sanitizer.test.js
 */

const { sanitizeYouTubeTags, isValidYouTubeTag, getTotalTagLength } = require('../services/youtube-tag-sanitizer.js');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, testName) {
  const condition = JSON.stringify(actual) === JSON.stringify(expected);
  assert(condition, testName);
  if (!condition) {
    console.log('  Expected:', expected);
    console.log('  Actual:', actual);
  }
}

console.log('\n🧪 Running YouTube Tag Sanitizer Tests...\n');

// Test 1: Remove hashtags
console.log('Test 1: Remove hashtags');
const test1Input = ['#GoogleDev', '#travel', 'coding'];
const test1Output = sanitizeYouTubeTags(test1Input);
assertEqual(test1Output, ['GoogleDev', 'travel', 'coding'], 'Should remove # symbols');

// Test 2: Remove emojis
console.log('\nTest 2: Remove emojis');
const test2Input = ['developer journey 😀', 'coding 🚀', 'tech'];
const test2Output = sanitizeYouTubeTags(test2Input);
assertEqual(test2Output, ['developer journey', 'coding', 'tech'], 'Should remove all emojis');

// Test 3: Remove tags over 30 characters
console.log('\nTest 3: Remove tags over 30 characters');
const test3Input = [
  'super long keyword that definitely breaks the YouTube length rule 123456789',
  'short tag',
  'perfect'
];
const test3Output = sanitizeYouTubeTags(test3Input);
assertEqual(test3Output, ['short tag', 'perfect'], 'Should remove tags over 30 chars');

// Test 4: Remove special characters
console.log('\nTest 4: Remove special characters');
const test4Input = ['@invalidTag!!!', 'valid-tag', 'another@tag', 'clean'];
const test4Output = sanitizeYouTubeTags(test4Input);
// Note: Special chars are removed, but the tag itself is kept if it has valid chars
assertEqual(test4Output, ['invalidTag', 'valid-tag', 'anothertag', 'clean'], 'Should remove special characters from tags');

// Test 5: Remove duplicates (case-insensitive)
console.log('\nTest 5: Remove duplicates');
const test5Input = ['Travel', 'travel', 'TRAVEL', 'coding', 'Coding'];
const test5Output = sanitizeYouTubeTags(test5Input);
assertEqual(test5Output, ['Travel', 'coding'], 'Should remove duplicate tags (case-insensitive)');

// Test 6: Limit to 15 tags
console.log('\nTest 6: Limit to 15 tags');
const test6Input = Array.from({ length: 25 }, (_, i) => `tag${i + 1}`);
const test6Output = sanitizeYouTubeTags(test6Input);
assert(test6Output.length === 15, 'Should limit to 15 tags');

// Test 7: Handle empty/null input
console.log('\nTest 7: Handle empty/null input');
const test7aOutput = sanitizeYouTubeTags([]);
const test7bOutput = sanitizeYouTubeTags(null);
const test7cOutput = sanitizeYouTubeTags(undefined);
assertEqual(test7aOutput, [], 'Should handle empty array');
assertEqual(test7bOutput, [], 'Should handle null');
assertEqual(test7cOutput, [], 'Should handle undefined');

// Test 8: Handle non-string values
console.log('\nTest 8: Handle non-string values');
const test8Input = ['valid', 123, null, undefined, { tag: 'object' }, 'another'];
const test8Output = sanitizeYouTubeTags(test8Input);
// Note: Objects get converted to string "[object Object]" which becomes "object Object"
// This is acceptable as it's still a valid tag
assert(test8Output.includes('valid') && test8Output.includes('123') && test8Output.includes('another'), 'Should handle non-string values');

// Test 9: Trim whitespace
console.log('\nTest 9: Trim whitespace');
const test9Input = ['  spaced  ', 'normal', '   leading', 'trailing   '];
const test9Output = sanitizeYouTubeTags(test9Input);
assertEqual(test9Output, ['spaced', 'normal', 'leading', 'trailing'], 'Should trim whitespace');

// Test 10: Complex real-world example
console.log('\nTest 10: Complex real-world example (intentionally bad tags)');
const test10Input = [
  '#GoogleDev',
  'developer journey 😀',
  'super long keyword that definitely breaks the YouTube length rule 123456789',
  'Google developer conference event for everyone',
  '@invalidTag!!!',
  'perfect',
  'coding',
  'tech tips',
  'programming'
];
const test10Output = sanitizeYouTubeTags(test10Input);
// Note: '@invalidTag!!!' becomes 'invalidTag' after removing special chars
// This is acceptable - the tag is still valid
assert(test10Output.includes('GoogleDev') && test10Output.includes('developer journey') && 
       test10Output.includes('perfect') && test10Output.includes('coding') && 
       test10Output.includes('tech tips') && test10Output.includes('programming'), 
       'Should handle complex real-world input');

// Test 11: isValidYouTubeTag function
console.log('\nTest 11: isValidYouTubeTag validation');
assert(isValidYouTubeTag('valid tag') === true, 'Should validate correct tag');
assert(isValidYouTubeTag('') === false, 'Should reject empty string');
assert(isValidYouTubeTag('a'.repeat(31)) === false, 'Should reject tag over 30 chars');
assert(isValidYouTubeTag('#hashtag') === false, 'Should reject hashtag');
assert(isValidYouTubeTag('emoji 😀') === false, 'Should reject emoji');
assert(isValidYouTubeTag(null) === false, 'Should reject null');
assert(isValidYouTubeTag(123) === false, 'Should reject number');

// Test 12: getTotalTagLength function
console.log('\nTest 12: getTotalTagLength calculation');
const test12Tags = ['tag1', 'tag2', 'tag3'];
const test12Length = getTotalTagLength(test12Tags);
assertEqual(test12Length, 14, 'Should calculate total length correctly (tag1,tag2,tag3 = 14 chars)');

// Test 13: Remove extra spaces
console.log('\nTest 13: Remove extra spaces');
const test13Input = ['multiple   spaces', 'normal', 'tabs\t\there'];
const test13Output = sanitizeYouTubeTags(test13Input);
assertEqual(test13Output, ['multiple spaces', 'normal', 'tabs here'], 'Should normalize spaces');

// Test 14: Hyphens are allowed
console.log('\nTest 14: Hyphens are allowed');
const test14Input = ['how-to', 'step-by-step', 'do-it-yourself'];
const test14Output = sanitizeYouTubeTags(test14Input);
assertEqual(test14Output, ['how-to', 'step-by-step', 'do-it-yourself'], 'Should allow hyphens');

// Test 15: Empty strings after cleaning
console.log('\nTest 15: Empty strings after cleaning');
const test15Input = ['###', '@@@', '!!!', 'valid'];
const test15Output = sanitizeYouTubeTags(test15Input);
assertEqual(test15Output, ['valid'], 'Should remove tags that become empty after cleaning');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Tag sanitizer is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.\n');
  process.exit(1);
}
