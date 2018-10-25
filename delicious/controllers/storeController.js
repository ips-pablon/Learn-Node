const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto) {
            next(null, true);
        } else {
            next({message: `That file type isn't allowed!`}, false);
        }
    }
};

exports.homePage = (req, res) => {
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
    // check if there is no new file to resize.
    if(!req.file) {
        next(); // Skip to next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    // Now we resize.
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);

    // Once we have written the photo to our file system, keep going!
    next();
};

exports.createStore = async (req, res) => {
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created <strong>${store.name}.</strong> Care to leave a review?`);
    res.redirect(`/stores/${store.slug}`);
};

exports.getStores = async (req, res) => {
    // 1. Query the database for a list of all stores.
    const stores = await Store.find();
    res.render('stores', {title: 'Stores', stores});
};

exports.editStore = async (req, res) => {
    // 1. Find the store given the ID
    const store = await Store.findOne({ _id: req.params.id });

    // 2. Confirm the are the owner of the store
    // TODO

    // 3. Render out the edit form so the user can update their store
    res.render('editStore', {title: `Edit ${store.name}`, store});
};

exports.updateStore = async (req, res) => {
    // Set the location data to be a point.
    req.body.location.type = 'Point';

    // 1. Find and update the store
    const store = await Store.findOneAndUpdate({_id: req.params.id }, req.body, {
        new: true, // Return the new store instead of the old one
        runValidators: true // Force model to run required validations against this update
    }).exec();

    // 2 Redirect them to the store and tell them it worked
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href='/stores/${store.slug}'>View Store →</a>`);
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug });
    if (!store) {
        return next();
    }
    res.render('store', {title: store.name, store});
};

exports.getStoresByTag = async (req, res) => {
    const tags = await Store.getTagsList();
    const tag = req.params.tag;
    res.render('tag', {title: 'Tags', tags, tag});
};
