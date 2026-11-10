const SearchDAO = require("../data/search-dao").SearchDAO;
const {
    environmentalScripts
} = require("../../config/config");

/* The SearchHandler must be constructed with a connected db */
function SearchHandler(db) {
    "use strict";

    const searchDAO = new SearchDAO(db);

    this.displaySearch = (req, res, next) => {
        const { name } = req.query;
        const { userId } = req.session;

        if (!name) {
            return res.render("search", {
                userId,
                results: [],
                searchName: "",
                environmentalScripts
            });
        }

        searchDAO.searchByName(name, (err, results) => {
            if (err) return next(err);

            return res.render("search", {
                userId,
                results,
                searchName: name,
                environmentalScripts
            });
        });
    };
}

module.exports = SearchHandler;

