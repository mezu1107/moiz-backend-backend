// src/validation/schemas/menuSchemas.js
const { body, query } = require('express-validator');

const getMenuByLocation = [
  query('lat').exists({ checkFalsy: true }).withMessage('Latitude is required')
    .isFloat({ min: 24, max: 37 }).withMessage('Latitude must be between 24 and 37'),
  query('lng').exists({ checkFalsy: true }).withMessage('Longitude is required')
    .isFloat({ min: 60, max: 78 }).withMessage('Longitude must be between 60 and 78')
];

const getAllMenuItemsWithFilters = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50').toInt(),
  query('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
  query('isVeg').optional().isIn(['true', 'false']).withMessage('isVeg must be true or false'),
  query('isSpicy').optional().isIn(['true', 'false']).withMessage('isSpicy must be true or false'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a positive number').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a positive number').toFloat(),
  query('search').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Search term must be 1-100 characters'),
  query('availableOnly').optional().isIn(['true', 'false']).withMessage('availableOnly must be true or false'),
  query('sort').optional().isIn([
    'category_asc',
    'name_asc',
    'name_desc',
    'price_asc',
    'price_desc',
    'newest',
    'oldest'
  ]).withMessage('Invalid sort option')
];

const addMenuItem = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('price').notEmpty().withMessage('Price is required')
    .isFloat({ min: 50 }).withMessage('Price must be at least 50'),
  body('category').notEmpty().withMessage('Category is required')
    .isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']).withMessage('Invalid category'),
  body('isVeg').optional().isBoolean().withMessage('isVeg must be true/false').toBoolean(),
  body('isSpicy').optional().isBoolean().withMessage('isSpicy must be true/false').toBoolean(),
  body('availableInAreas').optional().isArray().withMessage('availableInAreas must be an array'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long (max 500)')
];

const updateMenuItem = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('price').optional().isFloat({ min: 50 }).withMessage('Price must be at least 50'),
  body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']).withMessage('Invalid category'),
  body('isVeg').optional().isBoolean().withMessage('isVeg must be true/false').toBoolean(),
  body('isSpicy').optional().isBoolean().withMessage('isSpicy must be true/false').toBoolean(),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be true/false').toBoolean(),
  body('availableInAreas').optional().isArray(),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long (max 500)')
];

const toggleAvailability = [
  body('isAvailable').exists({ checkFalsy: true }).withMessage('isAvailable is required')
    .isBoolean().withMessage('isAvailable must be true/false').toBoolean()
];

module.exports = {
  getMenuByLocation,
  getAllMenuItemsWithFilters,
  addMenuItem,
  updateMenuItem,
  toggleAvailability
};