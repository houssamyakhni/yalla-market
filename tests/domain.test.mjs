import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {shippingForSubtotal, centsUntilFreeDelivery} from '../lib/delivery.ts';
import {isStoreImage} from '../lib/images.ts';

test('delivery charges honor the advertised strict over-$50 boundary', () => {
  for (const subtotal of [0, 4999, 5000]) assert.equal(shippingForSubtotal(subtotal), 300);
  for (const subtotal of [5001, 6000]) assert.equal(shippingForSubtotal(subtotal), 0);
  assert.equal(centsUntilFreeDelivery(4999), 2);
  assert.equal(centsUntilFreeDelivery(5000), 1);
  assert.equal(centsUntilFreeDelivery(5001), 0);
});

test('sample catalog has unique routes and complete color/gallery mappings', () => {
  const products = JSON.parse(readFileSync(new URL('../lib/catalog.seed.json', import.meta.url), 'utf8'));
  assert.equal(products.length, 120);
  assert.equal(new Set(products.map(p => p.id)).size, products.length);
  assert.equal(new Set(products.map(p => p.slug)).size, products.length);
  for (const p of products) {
    assert.equal(p.sample, true, `${p.id} must be identified as sample data`);
    assert.ok(Number.isInteger(p.price) && p.price > 0);
    assert.ok(Number.isInteger(p.stock) && p.stock >= 0);
    for (const color of p.colors) {
      assert.ok(color.image && p.images.includes(color.image), `${p.id}: missing gallery mapping`);
      if (color.image.startsWith('/')) assert.ok(existsSync(new URL(`../public${color.image}`, import.meta.url)));
    }
    for (const image of p.images) if (image.startsWith('/')) assert.ok(existsSync(new URL(`../public${image}`, import.meta.url)));
  }
});

test('admin image validation blocks unconfigured or foreign account images', () => {
  const endpoint = 'https://ik.imagekit.io/example-store';
  assert.equal(isStoreImage(`${endpoint}/products/photo.png`, endpoint), true);
  for (const value of [
    'https://ik.imagekit.io/another-store/photo.png',
    'https://ik.imagekit.io/example-store-other/photo.png',
    'https://ik.imagekit.io.example.com/example-store/photo.png',
    'http://ik.imagekit.io/example-store/photo.png',
    'https://ik.imagekit.io/example-store/../another-store/photo.png',
  ]) assert.equal(isStoreImage(value, endpoint), false);
  const withUserInfo = new URL(`${endpoint}/photo.png`);
  withUserInfo.username = 'demo';
  withUserInfo.password = 'placeholder';
  assert.equal(isStoreImage(withUserInfo.toString(), endpoint), false);
  assert.equal(isStoreImage(`${endpoint}/photo.png`, ''), false);
  assert.equal(isStoreImage(`${endpoint}/photo.png`, 'https://ik.imagekit.io/'), false);
});
