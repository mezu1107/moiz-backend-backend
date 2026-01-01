// scripts/seedMenuItems.js
require('dotenv').config();

const mongoose = require('mongoose');
const MenuItem = require('../src/models/menuItem/MenuItem');
const cloudinary = require('../src/config/cloudinary'); 
const fs = require('fs');
const path = require('path');

console.log('Mongo URI:', process.env.MONGO_URI);

// Folder containing your local images (public folder)
const IMAGES_FOLDER = path.join(__dirname, '../public');

// Area IDs – all menu items will be available here
const allAreaIds = [
  "6956b3067d12c702db8e020e",  // Pakistan Town
  "6956b2fb7d12c702db8e020a",  // Soan Garden Extension
  "6956b2db7d12c702db8e0206",  // Soan Garden
  "6956b2ce7d12c702db8e0202",  // Bahria Safari Villas
  "6956b2987d12c702db8e01fc",  // Police Foundation Housing Scheme
  "6956b28a7d12c702db8e01f8",  // PWD Housing Society
  "6956b2817d12c702db8e01f4",  // Media Town
  "6956b2757d12c702db8e01f0",  // Korang Town
  "6956b26a7d12c702db8e01ec",  // Airport Housing Society
  "6956b2607d12c702db8e01e8",  // Jinnah Garden
  "6956b2567d12c702db8e01e4",  // Naval Anchorage
  "6956b24a7d12c702db8e01e0",  // River Garden
  "6956b23f7d12c702db8e01dc",  // CBR Town
  "6956b2337d12c702db8e01d8",  // Bahria Town Phase 4
  "6956b2277d12c702db8e01d4"   // Gulraiz Housing Scheme
];

// Upload single image to Cloudinary
const uploadImage = async (filename) => {
  const filePath = path.join(IMAGES_FOLDER, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`Image not found: ${filename} (skipping upload)`);
    return { secure_url: null, public_id: null };
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'public',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:best', fetch_format: 'webp' }
      ]
    });
    console.log(`Uploaded: ${filename}`);
    return { secure_url: result.secure_url, public_id: result.public_id };
  } catch (err) {
    console.error(`Upload failed for ${filename}:`, err.message);
    return { secure_url: null, public_id: null };
  }
};

// Menu items with filenames
const menuItemsData = [
  { name: "Sada Paratha", filename: "Sada-Paratha.jpg", price: 60, unit: "pc", category: "breakfast", isVeg: true, isSpicy: false, description: "Fresh, flaky whole-wheat paratha cooked to golden perfection." },
  { name: "Lacha Paratha", filename: "Lacha-Paratha.jpg", price: 100, unit: "pc", category: "breakfast", isVeg: true, isSpicy: false, description: "Crispy, multi-layered paratha made from whole wheat dough, pan-cooked until golden and flaky." },
  { name: "Meetha Paratha", filename: "Meetha-Paratha.jpg", price: 100, unit: "pc", category: "breakfast", isVeg: true, isSpicy: false, description: "Sweet whole-wheat paratha cooked to golden perfection." },
  { name: "Aloo Paratha", filename: "Aloo-Paratha.jpg", price: 150, unit: "pc", category: "breakfast", isVeg: true, isSpicy: true, description: "Soft whole wheat flatbread stuffed with spiced mashed potatoes. Served best with yogurt or butter." },
  { name: "Qeema Paratha", filename: "Qeema-Partha.jpg", price: 200, unit: "pc", category: "breakfast", isVeg: false, isSpicy: true, description: "Flaky paratha stuffed with spiced minced meat." },
  { name: "Aloo Cheese Paratha", filename: "Aloo-Cheese-Paratha.jpg", price: 230, unit: "pc", category: "breakfast", isVeg: true, isSpicy: true, description: "Paratha stuffed with spiced potatoes and melted cheese." },
  { name: "Qeema Cheese Paratha", filename: "Qeema-Cheese-Paratha.jpg", price: 300, unit: "pc", category: "breakfast", isVeg: false, isSpicy: true, description: "Paratha stuffed with spiced minced meat and cheese." },
  { name: "Special Masala Biryani", filename: "Special-Masala-Biryani.jpg", price: 280, unit: "pc", category: "lunch", isVeg: false, isSpicy: true, description: "Aromatic basmati rice layered with marinated meat and rich spices." },
  { name: "Chicken Pulao", filename: "Chicken-Pulao.jpg", price: 240, unit: "pc", category: "lunch", isVeg: false, isSpicy: true, description: "Fragrant rice cooked with tender chicken pieces." },
  { name: "Matar Pulao", filename: "Matar-Pulso.jpg", price: 180, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Light and flavorful rice with green peas." },
  { name: "Chana Pulao", filename: "Chana-Pulao.jpg", price: 180, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Rice cooked with chickpeas and aromatic spices." },
  { name: "Ublay Chawal", filename: "Ublay-Chawal.jpg", price: 160, unit: "pc", category: "lunch", isVeg: true, isSpicy: false, description: "Plain boiled basmati rice – perfect side for curries." },
  { name: "Chai / Karak Chai", filename: "Karak-chaye.jpg", price: 70, unit: "cup", category: "beverages", isVeg: true, isSpicy: false, description: "Strong spiced milk tea." },
  { name: "Doodh Patti", filename: "Doodh-Patti.jpg", price: 90, unit: "cup", category: "beverages", isVeg: true, isSpicy: false, description: "Rich and creamy traditional milk tea." },
  { name: "Gur Wali chaye", filename: "Gur-Wali-Chaye.jpg", price: 100, unit: "cup", category: "beverages", isVeg: true, isSpicy: false, description: "Tea sweetened with natural jaggery." },
  { name: "Gulabi Chaye", filename: "Gulabi-Chaye.jpg", price: 150, unit: "cup", category: "beverages", isVeg: true, isSpicy: false, description: "Fragrant rose-flavored milk tea." },
  { name: "Chanay", filename: "Chanay.jpg", price: 200, unit: "pc", category: "lunch", isVeg: true, isSpicy: false, description: "Spiced chickpeas – a classic comfort dish." },
  { name: "Chicken Chanay", filename: "Chicken-chanay.jpg", price: 230, unit: "pc", category: "lunch", isVeg: false, isSpicy: true, description: "Chicken cooked with chickpeas in rich gravy." },
  { name: "Chicken Karahi", filename: "Chicken-Karahi.jpg", price: 300, unit: "pc", category: "lunch", isVeg: false, isSpicy: true, description: "Tender chicken in tomato-based spicy curry." },
  { name: "Koftay Chanay", filename: "Koftay-Chanay.jpg", price: 240, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Chickpea koftas in spiced gravy." },
  { name: "Chicken Qeema", filename: "Chicken-Qeema.jpg", price: 340, unit: "pc", category: "breakfast", isVeg: false, isSpicy: true, description: "Spiced minced chicken – great with paratha." },
  { name: "Karhi Pakora", filename: "Karhi-Pakora.jpg", price: 200, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Tangy yogurt curry with gram flour fritters." },
  { name: "Mix Sabzi", filename: "Mix-Sabzi.jpg", price: 200, unit: "pc", category: "dinner", isVeg: true, isSpicy: true, description: "Mixed seasonal vegetables in spiced gravy." },
  { name: "Aloo Matar", filename: "Aloo-Matar.jpg", price: 220, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Potatoes and peas in tomato-onion gravy." },
  { name: "Baingan ka Bharta", filename: "Baingan-ka-bharta.jpg", price: 220, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Smoky mashed eggplant with spices." },
  { name: "Chat Pat Aloo Ki Bhujian", filename: "Aloo-Ki-Bhujian.jpg", price: 180, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Tangy and spicy stir-fried potatoes." },
  { name: "Mix Daal", filename: "Mix-Dalen.jpg", price: 200, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Blend of lentils tempered with spices." },
  { name: "Shahi Daal Maash", filename: "Shahi-Daal-Mash.jpg", price: 200, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Creamy black gram lentil curry." },
  { name: "Surkh Lobia", filename: "Surkh-Lobia.jpg", price: 220, unit: "pc", category: "lunch", isVeg: true, isSpicy: false, description: "Red kidney beans in mild spiced gravy." },
  { name: "Sabit Masoor", filename: "Sabut-Masoor_dal.jpg", price: 200, unit: "pc", category: "lunch", isVeg: true, isSpicy: true, description: "Whole red lentils cooked with spices." },
  { name: "Sada Omelete", filename: "Simple-Omelete.jpg", price: 70, unit: "pc", category: "breakfast", isVeg: false, isSpicy: false, description: "Simple egg omelette." },
  { name: "Heavy Omelet", filename: "Heavy-Omelete.jpg", price: 100, unit: "pc", category: "breakfast", isVeg: false, isSpicy: true, description: "Loaded omelette with veggies and spices." },
  { name: "Half/Full Fry Egg", filename: "Half-Fry-Egg.jpg", price: 60, unit: "pc", category: "breakfast", isVeg: false, isSpicy: false, description: "Classic fried egg – half or full." }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Optional: Remove old items
    // await MenuItem.deleteMany({});
    // console.log('Cleared existing menu items.');

    const menuItemsToInsert = [];

    for (const item of menuItemsData) {
      const { secure_url, public_id } = await uploadImage(item.filename);

      if (!secure_url) continue; // skip if upload failed

      menuItemsToInsert.push({
        name: item.name.trim(),
        description: item.description.trim(),
        price: item.price,
        unit: item.unit,
        category: item.category,
        image: secure_url,
        cloudinaryId: public_id,
        isVeg: item.isVeg,
        isSpicy: item.isSpicy,
        isAvailable: true,
        availableInAreas: allAreaIds,
        pricedOptions: { sides: [], drinks: [], addOns: [] }
      });
    }

    await MenuItem.insertMany(menuItemsToInsert);

    console.log(`All ${menuItemsToInsert.length} menu items successfully seeded!`);
    console.log('Images uploaded from local folder to Cloudinary.');
    console.log('All items are now available in ALL areas.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

seed();
