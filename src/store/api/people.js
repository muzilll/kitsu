import superagent from 'superagent'

export default {

  getPeople (callback) {
    superagent
      .get('/api/data/persons')
      .end((err, res) => {
        callback(err, res.body)
      })
  },

  newPerson (person, callback) {
    const data = {
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone
    }
    superagent
      .post(`/api/data/persons/`)
      .send(data)
      .end((err, res) => {
        callback(err, res.body)
      })
  },

  updatePerson (person, callback) {
    const data = {
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone
    }
    superagent
      .put(`/api/data/persons/${person.id}`)
      .send(data)
      .end((err, res) => {
        callback(err, res.body)
      })
  },

  deletePerson (personId, callback) {
    superagent
      .del(`/api/data/persons/${personId}`)
      .end((err, res) => {
        callback(err, res.body)
      })
  }

}
