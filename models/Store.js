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
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true}
});

// Define our indexes
storeSchema.index({
   name: 'text',
   description: 'text'
});

storeSchema.index({ location: '2dsphere' });

function autopopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);
storeSchema.pre('save', async function (next) {
    if (!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);

    // Find other stores that have a slug of store, store-1, store-2
    const slugRegEx = new RegExp(`(${this.slug})((-[0-9]*$)?)`, 'i');
    const storesWithSlug = await this.constructor.find({slug: slugRegEx});

    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length+1}`;
    }

    next();
});

// Aggregate don't know about virtual variables.
storeSchema.statics.getTagsList = function() {
  return this.aggregate([
      { $unwind: '$tags' },
      { $group: {_id: '$tags', count: {$sum: 1} } },
      { $sort: {count: -1} }
  ]);
};

// Aggregate don't know about virtual variables.
storeSchema.statics.getTopStores = function() {
    return this.aggregate([
        // Lookup Stores and populate their reviews
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'store',
                as: 'reviews'
            }
        },
        // Filter for only items that have 2 or more reviews
        {
            $match: {
                'reviews.1': { $exists: true }
            }
        },
        // Add the average reviews field
        {
            $addFields: {
                averageRating: { $avg: '$reviews.rating' }
            }
        },
        // Sort it by our new field, highest reviews first
        { $sort: { averageRating: -1 } },
        // Limit to at most 10
        { $limit: 10 }
    ]);
};

storeSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'store'
});

module.exports = mongoose.model('Store', storeSchema);
