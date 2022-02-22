import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import { rules, schema } from '@ioc:Adonis/Core/Validator'
import qs from 'qs'
import axios from 'axios'

export default class AuthController {
  public async register({ request, response }: HttpContextContract) {
    // validate email
    const validations = await schema.create({
      email: schema.string({}, [rules.email(), rules.unique({ table: 'users', column: 'email' })]),
      password: schema.string({}, [rules.confirmed()]),
      username: schema.string({}, [rules.unique({ table: 'users', column: 'username' })]),
    })
    const data = await request.validate({ schema: validations })
    const user = await User.create(data)
    return response.created(user)
  }

  //   login function
  public async login({ request, response, auth }: HttpContextContract) {
    const password = await request.input('password')
    const email = await request.input('email')

    // ::: LOGIN USING MAP API :::
    try {
      const user = await User.findByOrFail('email', email)
      let url = 'https://map.bpkp.go.id/api/v3/login'
      const responseMap = await axios({
        method: 'POST',
        url: url,
        data: qs.stringify({
          username: user.username,
          password: password,
          kelas_user: 0,
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      })
      if (responseMap.status === 200) {
        // Generate token
        const token = await auth.use('api').generate(user, {
          expiresIn: '24hours',
        })
        return response.ok({ status: responseMap.status, data: { ...token.toJSON(), user } })
      }
    } catch (err) {
      return response.badRequest({ message: err })
    }

    // try {
    //   const token = await auth.use('api').attempt(email, password, {
    //     expiresIn: '24hours',
    //   })
    //   return token.toJSON()
    // } catch {
    //   return response
    //     .status(400)
    //     .send({ error: { message: 'User with provided credentials could not be found' } })
    // }
  }

  //   logout function
  public async logout({ auth, response }: HttpContextContract) {
    await auth.logout()
    return response.status(200)
  }
}
