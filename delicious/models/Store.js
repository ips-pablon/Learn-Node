const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // Global is like window in the Browser but for the server.
const slug = require('slugs'); // Used to make URL friendly names

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name!'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String]
});

storeSchema.pre('save', function (next) {
    if (!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);
    next();

    // TODO make more resilient so slugs are unique
});

module.exports = mongoose.model('Store', storeSchema);
