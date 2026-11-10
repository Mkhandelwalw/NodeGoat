/* The SearchDAO must be constructed with a connected database object */
function SearchDAO(db) {

    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof SearchDAO)) {
        console.log("Warning: SearchDAO constructor called without 'new' operator");
        return new SearchDAO(db);
    }

    const usersCol = db.collection("users");

    this.searchByName = (name, callback) => {
        // Search users whose firstName or lastName matches the given name (case-insensitive)
        const searchRegex = new RegExp(name, "i");
        usersCol.find({
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex }
            ]
        }).toArray((err, users) => {
            if (err) return callback(err, null);
            // Return only safe fields
            const results = users.map((user) => ({
                _id: user._id,
                userName: user.userName,
                firstName: user.firstName,
                lastName: user.lastName
            }));
            callback(null, results);
        });
    };
}

module.exports = { SearchDAO };

