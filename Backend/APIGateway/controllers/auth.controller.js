const db = require("../models");
const config = require("../config/auth.config");
const User = db.user;
const Role = db.role;
const Info = db.info;

const Op = db.Sequelize.Op;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");

exports.signup = (req, res) => {
  // Save User to Database
  User.create({
    email: req.body.email,
    phone: req.body.phone,
    password: bcrypt.hashSync(req.body.password, 8)
  })
    .then(user => {
      if (req.body.roles) {
        Role.findAll({
          where: {
            name: {
              [Op.or]: req.body.roles
            }
          }
        }).then(roles => {
          user.setRoles(roles).then(() => {
            Info.create({
              userId: user.id,
              name: req.body.name,
              surname: req.body.surname
            }).then(info =>{
              res.send({ 
                message: "User was registered successfully!",
                id: user.id
              });
            })
          });
        });
      } else {
        // user role = 1
        user.setRoles([1]).then(() => {
          Info.create({
            userId: user.id,
            name: req.body.name,
            surname: req.body.surname
          }).then(info =>{
            res.send({ 
              message: "User was registered successfully!",
              id: user.id
            });
          })
        });
      }
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};

exports.signin = (req, res) => {
  User.findOne({
    where: {
      email: req.body.email
    }
  })
    .then(user => {
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400 // 24 hours
      });

      var authorities = [];
      user.getRoles().then(roles => {
        for (let i = 0; i < roles.length; i++) {
          authorities.push("ROLE_" + roles[i].name.toUpperCase());
        }
        res.status(200).send({
          id: user.id,
          email: user.email,
          phone: user.phone,
          roles: authorities,
          accessToken: token
        });
      });
    })
    .catch(err => {
      res.status(500).send({ message: err.message });
    });
};
